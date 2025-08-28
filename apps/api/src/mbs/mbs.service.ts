import { Injectable } from '@nestjs/common';
import { KBRulesLoader } from './loader';
import { MbsExtractorService } from './extractor.service';
import { LexicalRetrieverService } from './retriever.service';
import type { ExtractedEpisode, KBItem, MbsCodesItemDTO, MbsCodesRequestDTO, MbsCodesResponseDTO, RuleEntry, RuleResultEval } from './types';
import { MetricsService } from './metrics.service';
import { AuditLogService } from './audit-log.service';

@Injectable()
export class MbsCodesService {
  constructor(
    private readonly extractor: MbsExtractorService,
    private readonly retriever: LexicalRetrieverService,
    private readonly loader: KBRulesLoader,
    private readonly metrics: MetricsService,
    private readonly audit: AuditLogService,
  ) {}

  async handle(request: MbsCodesRequestDTO): Promise<MbsCodesResponseDTO> {
    const started = Date.now();
    const note = request.note_text || '';

    // 1) Extract entities/evidence
    const episode = this.extractor.extract(note);

    // 2) Retrieve candidates (parallelize lexical + rag when enabled)
    const topK = Math.max(1, Math.min(request.options?.top_k ?? 5, 20));
    const useRag = String(process.env.RAG_ENABLED || '').toLowerCase() === 'true';

    const ragTask = (async () => {
      if (!useRag) return { scores: null as Map<string, number> | null, used: false };
      try {
        const { RagService } = await import('../rag/rag.service');
        const rag = new RagService();
        const ragRes: any = await rag.queryRag(note, topK * 3);
        if (ragRes && Array.isArray(ragRes.results)) {
          const scores = new Map<string, number>();
          for (const r of ragRes.results) {
            const raw = r.match_score;
            if (raw === null || raw === undefined) continue;
            let s = Number(raw);
            if (!isFinite(s)) continue;
            if (s > 1 && s <= 100) s = s / 100;
            s = Math.max(0, Math.min(1, s));
            const code = String(r.itemNum ?? r.ItemNum ?? '').trim();
            if (!code) continue;
            const prev = scores.get(code);
            if (prev === undefined || s > prev) scores.set(code, s);
          }
          return { scores, used: scores.size > 0 };
        }
      } catch {}
      return { scores: null as Map<string, number> | null, used: false };
    })();

    // lexical is synchronous CPU work; start ragTask first, then compute lexical
    const retrievedLex = this.retriever.retrieve(note, topK * 3, episode);
    const { scores: ragScores, used: ragUsed } = await ragTask;

    // 3) Rule evaluation + scoring over union of lexical and rag candidates
    const bundle = this.loader.getBundle();
    const rules = bundle.rules;
    const kbIndex = new Map<string, KBItem>(bundle.kb.map((it) => [String(it.item), it]));
    const lexMap = new Map<string, { item: KBItem; lex: number }>(retrievedLex.map(({ item, score }) => [String(item.item), { item, lex: score }]));
    const keys = new Set<string>([...lexMap.keys(), ...(ragScores ? Array.from(ragScores.keys()) : [])]);

    const rerankWeight = Math.max(0, Math.min(1, Number(process.env.RERANK_WEIGHT || 0.6)));
    const candidates: Array<{ item: KBItem; baseSim: number }> = [];
    for (const code of keys) {
      const item = kbIndex.get(code);
      if (!item) continue;
      const sLex = lexMap.get(code)?.lex ?? 0;
      const sRerank = ragScores?.get(code);
      const baseSim = sRerank !== undefined && sRerank !== null
        ? rerankWeight * sRerank + (1 - rerankWeight) * sLex
        : sLex;
      candidates.push({ item, baseSim });
    }
    candidates.sort((a, b) => b.baseSim - a.baseSim);

    const items: MbsCodesItemDTO[] = candidates
      .slice(0, topK)
      .map(({ item, baseSim }) => this.evaluateAndScore(item, baseSim, episode, rules));

    // 4) Low-confidence message
    const lowConfidence = items.length > 0 && Math.max(...items.map(i => i.confidence)) < 0.5
      ? 'Key details may be missing (e.g., duration, location, telehealth mode, referral/report). Please verify against MBS Online.'
      : undefined;

    const response = {
      items,
      low_confidence_message: lowConfidence,
      meta: {
        prompt_version: process.env.PROMPT_VERSION || 'none',
        rules_version: bundle.versions.rules,
        duration_ms: Date.now() - started,
        pipeline_flags: { retriever: ragUsed ? 'lexical+rag' : 'lexical', gates: 'v1', rerank: ragUsed, rerank_weight: rerankWeight },
      },
    };

    // metrics + audit
    this.metrics.setVersions(bundle.versions);
    this.metrics.recordRequest(response.meta.duration_ms, { lowConfidence: !!lowConfidence });
    this.audit.append({ route: 'POST /mbs-codes', req: request, res: response });

    return response;
  }

  private evaluateAndScore(item: KBItem, baseSim: number, ep: ExtractedEpisode, rules: RuleEntry[]): MbsCodesItemDTO {
    const applied = rules.filter(r => r.applies_to?.includes(item.item));

    const evals: RuleResultEval[] = [];
    let anyHardFail = false;
    let softPassCount = 0;
    let softTotal = 0;
    let penaltyConflicts = 0;
    const margins: Record<string, number> = {};

    for (const r of applied) {
      const res = this.evalRule(r, item, ep, margins);
      evals.push(res);
      if (r.hard) {
        if (!res.pass) anyHardFail = true;
      } else {
        softTotal += 1; if (res.pass) softPassCount += 1;
      }
      if (!res.pass && r.kind === 'same_day_exclusive') penaltyConflicts = Math.max(penaltyConflicts, 0.5);
    }

    const sRuleSoft = softTotal > 0 ? softPassCount / softTotal : 1;

    // Evidence sufficiency heuristic
    const evidenceSuff = this.estimateEvidenceSufficiency(item, ep);

    // Margin bonus
    const marginBonus = Math.max(0, Math.min(0.2, (margins['duration'] || 0) / 60 * 0.2));

    // Base score: normalized sim + bonus
    let score = Math.max(0, Math.min(1, baseSim + marginBonus));

    // Rule gating and soft coverage
    if (anyHardFail) score = Math.min(score, 0.3);
    score = score * (0.7 + 0.3 * sRuleSoft) * (0.7 + 0.3 * evidenceSuff) * (1 - penaltyConflicts);

    // Map to confidence via logistic-like smoothing
    const confidence = Math.max(0, Math.min(1, 1 / (1 + Math.exp(-4 * (score - 0.5)))));

    const reasoning = this.buildReasoning(item, ep, evals);
    const ev = ep.evidence.slice(0, 8);

    return {
      item: item.item,
      title: item.title,
      confidence,
      reasoning,
      evidence: ev,
      rule_results: evals,
    };
  }

  private evalRule(rule: RuleEntry, item: KBItem, ep: ExtractedEpisode, margins: Record<string, number>): RuleResultEval {
    switch (rule.kind) {
      case 'min_duration_by_level': {
        const min = Number(rule.parameters?.min || 0);
        const ok = typeof ep.durationMin === 'number' ? ep.durationMin >= min : false;
        if (ok && typeof ep.durationMin === 'number') margins['duration'] = ep.durationMin - min;
        return { rule_id: rule.id, pass: ok, hard: !!rule.hard, because: ok ? `duration ${ep.durationMin} >= ${min}` : `requires >= ${min} minutes` };
      }
      case 'eligibility_required': {
        const p = rule.parameters || {};
        let ok = true; const because: string[] = [];
        if (p.mode) { ok = ok && (ep.telehealthMode === p.mode); because.push(`mode=${ep.telehealthMode}`); }
        if (p.hoursBucket) { ok = ok && (ep.hoursBucket === p.hoursBucket); because.push(`hours=${ep.hoursBucket}`); }
        if (p.elements && Array.isArray(p.elements)) {
          const bag = ep.evidence.map(e => e.field.toLowerCase()).join(' ');
          const miss = (p.elements as any[]).filter((e: any) => !bag.includes(String(e).toLowerCase()));
          if (miss.length > 0) ok = false;
          because.push(`elements_missing=${miss?.join(',') || 'none'}`);
        }
        if (p.location) { ok = ok && (ep.location === p.location); because.push(`location=${ep.location}`); }
        if (p.report === true) { ok = ok && !!ep.reportPresent; because.push(`reportPresent=${ep.reportPresent}`); }
        if (p.referral === true) { ok = ok && !!ep.referralPresent; because.push(`referralPresent=${ep.referralPresent}`); }
        if (typeof p.min_age === 'number') { ok = ok && (typeof ep.ageYears === 'number' && ep.ageYears >= p.min_age); because.push(`age>=${p.min_age} (${ep.ageYears ?? 'n/a'})`); }
        if (typeof p.max_age === 'number') { ok = ok && (typeof ep.ageYears === 'number' && ep.ageYears <= p.max_age); because.push(`age<=${p.max_age} (${ep.ageYears ?? 'n/a'})`); }
        if (Array.isArray(p.has_procedure) && p.has_procedure.length > 0) {
          const names = new Set((ep.procedures || []).map(pr => pr.name));
          const miss = p.has_procedure.filter((nm: string) => !names.has(nm));
          if (miss.length > 0) ok = false;
          because.push(`procedures_missing=${miss.join(',') || 'none'}`);
        }
        if (Array.isArray(p.procedure_with_report) && p.procedure_with_report.length > 0) {
          const byName: Record<string, boolean> = {};
          for (const pr of (ep.procedures || [])) byName[pr.name] = !!pr.withReport;
          const miss = p.procedure_with_report.filter((nm: string) => !byName[nm]);
          if (miss.length > 0) ok = false;
          because.push(`with_report_missing=${miss.join(',') || 'none'}`);
        }
        return { rule_id: rule.id, pass: ok, hard: !!rule.hard, because: because.join('; ') };
      }
      case 'location_must_be': {
        const loc = String(rule.parameters?.location || '');
        const ok = ep.location === loc;
        return { rule_id: rule.id, pass: ok, hard: !!rule.hard, because: `location=${ep.location}` };
      }
      case 'require_report': {
        const p = rule.parameters || {};
        let ok = !!ep.reportPresent;
        if (Array.isArray(p.procedure) && p.procedure.length > 0) {
          const map: Record<string, boolean> = {};
          for (const pr of (ep.procedures || [])) map[pr.name] = !!pr.withReport;
          ok = p.procedure.every((nm: string) => !!map[nm]);
        }
        return { rule_id: rule.id, pass: ok, hard: !!rule.hard, because: `reportPresent=${ep.reportPresent}` };
      }
      case 'forbid_with':
      case 'same_day_exclusive': {
        return { rule_id: rule.id, pass: true, hard: !!rule.hard, because: 'checked at selection time' };
      }
      default:
        return { rule_id: rule.id, pass: true, hard: !!rule.hard, because: 'n/a' };
    }
  }

  private estimateEvidenceSufficiency(item: KBItem, ep: ExtractedEpisode): number {
    const keys = new Set(ep.evidence.map(e => e.field.split(':')[0]));
    const needed = new Set<string>();
    for (const s of (item.eligibility || [])) {
      const s2 = s.toLowerCase();
      if (s2.includes('minute')) needed.add('duration');
      if (s2.includes('face-to-face') || s2.includes('in rooms') || s2.includes('clinic')) needed.add('location');
      if (s2.includes('video') || s2.includes('telehealth') || s2.includes('phone')) needed.add('mode');
      if (s2.includes('referral')) needed.add('referral');
      if (s2.includes('report') || s2.includes('interpretation')) needed.add('report');
      if (s2.includes('after-hours') || s2.includes('public holiday')) needed.add('hoursBucket');
      if (s2.includes('child') || s2.includes('years') || s2.includes('age')) needed.add('age');
    }
    if (needed.size === 0) return 1;
    let hit = 0; for (const k of needed) if (keys.has(k)) hit++;
    return hit / needed.size;
  }

  private buildReasoning(item: KBItem, ep: ExtractedEpisode, evals: RuleResultEval[]): string {
    const passes = evals.filter(e => e.pass).map(e => e.rule_id);
    const fails = evals.filter(e => !e.pass).map(e => e.rule_id);
    const bits: string[] = [];
    if (ep.durationMin) bits.push(`duration ${ep.durationMin}m`);
    if (ep.telehealthMode) bits.push(`mode ${ep.telehealthMode}`);
    if (ep.location) bits.push(`location ${ep.location}`);
    if (ep.hoursBucket) bits.push(`hours ${ep.hoursBucket}`);
    if (typeof ep.ageYears === 'number') bits.push(`age ${ep.ageYears}`);
    if (ep.referralPresent) bits.push('referral present');
    if (ep.reportPresent) bits.push('report present');
    if (passes.length) bits.push(`rules ok: ${passes.join(',')}`);
    if (fails.length) bits.push(`rules failed: ${fails.join(',')}`);
    return bits.join(' · ');
  }
}
