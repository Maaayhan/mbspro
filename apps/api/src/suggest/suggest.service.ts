import { Injectable, Logger } from "@nestjs/common";
import { SuggestRequestDto } from "./dto/suggest-request.dto";
import { SuggestResponseDto } from "./dto/suggest-response.dto";
import type { SuggestResponse, SuggestCandidate } from "@mbspro/shared";
import { SignalExtractorService } from "./signal-extractor.service";
import { RankerService } from "./ranker.service";
import { ExplainService } from "./explain.service";
import { RuleEngineService } from "./rule-engine.service";
import { RagService } from "../rag/rag.service";
import { MetricsService } from "../mbs/metrics.service";
import { LexicalRetrieverService } from "../mbs/retriever.service";

@Injectable()
export class SuggestService {
  private readonly logger = new Logger(SuggestService.name);

  constructor(
    private readonly signalExtractor: SignalExtractorService,
    private readonly ranker: RankerService,
    private readonly explainer: ExplainService,
    private readonly rules: RuleEngineService,
    private readonly rag: RagService,
    private readonly metrics: MetricsService,
    private readonly lexical: LexicalRetrieverService
  ) {}

  async suggest(request: SuggestRequestDto): Promise<SuggestResponseDto> {
    const started = Date.now();
    const note = request.note || "";
    const topN = request.topN && request.topN > 0 ? request.topN : 5;

    try {
      const signalsInternal = this.signalExtractor.extract(note);
      const topK = Math.max(30, topN * 10);

      // Lexical + RAG retrieval
      let rows: any[] = [];
      let lexMap: Map<string, number> = new Map();
      try {
        const lexTop = Math.min(topK, 20);
        const lex = this.lexical.retrieve(note, lexTop);
        lexMap = new Map<string, number>(
          lex.map((it: any) => [String(it.item.item), Number(it.score) || 0])
        );
      } catch (e) {
        this.logger.warn(`Lexical retrieve failed: ${String(e)}`);
      }
      try {
        const rag = await this.rag.queryRag(note, Math.min(topN + 3, 15));
        if (rag && Array.isArray((rag as any).results)) {
          rows = (rag as any).results.map((r: any) => ({
            code:
              r.itemNum ||
              (Array.isArray(r.itemNums) ? r.itemNums[0] || "" : ""),
            title: r.title || "",
            description: r.description || "",
            match_reason: r.match_reason || "",
            fee: r.fee ? parseFloat(String(r.fee).replace(/[^0-9.]/g, "")) : 0,
            flags: {},
            time_threshold: undefined,
            bm25:
              typeof r.match_score === "number"
                ? r.match_score > 1 && r.match_score <= 100
                  ? Math.max(0, Math.min(1, r.match_score / 100))
                  : Math.max(0, Math.min(1, r.match_score))
                : 0,
          }));
        }
      } catch (e) {
        this.logger.warn(`RAG query failed: ${String(e)}`);
      }
      // Normalize bm25 across this query to [0,1] for better separation
      const maxBm =
        rows.length > 0
          ? Math.max(...rows.map((r: any) => Number(r.bm25) || 0))
          : 0;
      if (maxBm > 0) {
        rows = rows.map((r: any) => ({
          ...r,
          bm25n: Math.max(0, Math.min(1, (Number(r.bm25) || 0) / maxBm)),
        }));
      } else {
        rows = rows.map((r: any) => ({ ...r, bm25n: 0 }));
      }
      // Preserve item facts so ranker and rules can use them
      const rowsForRanker = rows.map(
        (r) =>
          ({
            code: r.code,
            title: r.title,
            description: r.description,
            match_reason: r.match_reason,
            fee: r.fee || 0,
            time_threshold: r.time_threshold,
            flags: r.flags,
            mutually_exclusive_with: (r as any).mutually_exclusive_with || [],
            reference_docs: (r as any).reference_docs || [],
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            sim: (r as any).bm25n ?? r.bm25,
            // Attach lexical score for later baseSim fusion
            _lex: lexMap.get(String(r.code)) ?? 0,
          }) as any
      );

      const ranked = this.ranker.rank({
        rows: rowsForRanker,
        signals: signalsInternal,
        topN,
      });
      const withRules = ranked.map((c) => {
        const original = rowsForRanker.find(
          (r) => String(r.code) === String(c.code)
        );
        const { ruleResults, compliance, blocked, penalties, warnings } =
          this.rules.evaluate({
            note: {
              mode: signalsInternal.mode,
              after_hours: signalsInternal.afterHours,
              chronic: signalsInternal.chronic,
              duration: signalsInternal.duration,
              keywords: signalsInternal.keywords,
            },
            item: {
              code: c.code,
              time_threshold: original?.time_threshold,
              flags: original?.flags || {},
              mutually_exclusive_with: original?.mutually_exclusive_with || [],
            },
            context: {
              selected_codes: Array.isArray((request as any).selectedCodes)
                ? (request as any).selectedCodes.map(String)
                : [],
              last_claimed_items: Array.isArray(
                (request as any).lastClaimedItems
              )
                ? (request as any).lastClaimedItems
                : [],
              provider_type: (request as any).providerType,
              location: (request as any).location,
              referral_present: (request as any).referralPresent,
              hours_bucket: (request as any).hoursBucket,
              consult_start: (request as any).consultStart,
              consult_end: (request as any).consultEnd,
              now_iso: new Date().toISOString(),
            },
          });
        // Add fee to feature_hits
        const featureHits = [...(c.feature_hits || [])];
        if (original?.fee && original.fee > 0) {
          featureHits.push(`Fee: $${original.fee.toFixed(2)}`);
        }

        const riskBanner = compliance;
        // Build base similarity explicitly from RAG bm25 and feature component
        const bm25 = Math.max(
          0,
          Math.min(1, Number((c as any).score_breakdown?.bm25 ?? 0))
        );
        const scoreRaw = Number((c as any).score_breakdown?.score_raw ?? 0);
        const alpha = Math.max(
          0,
          Math.min(1, Number(process.env.RANKER_ALPHA ?? 0.7))
        );
        const beta = Math.max(
          0,
          Math.min(1, Number(process.env.RANKER_BETA ?? 0.3))
        );
        let featureRaw = beta > 0 ? (scoreRaw - alpha * bm25) / beta : 0;
        featureRaw = Math.max(0, Math.min(1, featureRaw));
        const wr = Number.isFinite(Number(process.env.SUGGEST_RAG_WEIGHT))
          ? Number(process.env.SUGGEST_RAG_WEIGHT)
          : 0.7;
        const wf = Number.isFinite(Number(process.env.SUGGEST_FEAT_WEIGHT))
          ? Number(process.env.SUGGEST_FEAT_WEIGHT)
          : 0.1;
        const wl = Number.isFinite(Number(process.env.SUGGEST_LEX_WEIGHT))
          ? Number(process.env.SUGGEST_LEX_WEIGHT)
          : 0.2;
        const wRag = Math.max(0, Math.min(1, wr));
        const wFeat = Math.max(0, Math.min(1, wf));
        const wLex = Math.max(0, Math.min(1, wl));
        const norm = wRag + wFeat + wLex || 1;
        const lex = Math.max(
          0,
          Math.min(1, Number((original as any)?._lex ?? 0))
        );
        let baseSim = Math.max(
          0,
          Math.min(1, (wRag * bm25 + wFeat * featureRaw + wLex * lex) / norm)
        );
        // Consistency boost if both RAG and Lexical hit
        const agreeBoost = Number.isFinite(
          Number(process.env.SUGGEST_AGREEMENT_BOOST)
        )
          ? Number(process.env.SUGGEST_AGREEMENT_BOOST)
          : 1.06;
        if (bm25 > 0 && lex > 0)
          baseSim = Math.max(0, Math.min(1, baseSim * agreeBoost));
        // Power stretch to amplify separation (gamma > 1 raises top, lowers tail)
        const gamma = Number.isFinite(Number(process.env.SUGGEST_GAMMA))
          ? Number(process.env.SUGGEST_GAMMA)
          : 1.35;
        if (gamma && gamma !== 1)
          baseSim = Math.max(0, Math.min(1, Math.pow(baseSim, gamma)));

        // v1 confidence (aligned with /mbs-codes):
        // - hard gate: any fail => cap to 0.3
        // - soft coverage: warn proportion reduces scale
        // - evidence sufficiency heuristic from extracted signals
        // - margin bonus for duration above threshold
        // - conflict penalty already in penalties
        const anyFail = ruleResults.some((r) => r.status === "fail");
        const warnCount = ruleResults.filter((r) => r.status === "warn").length;
        const softTotal = warnCount + (anyFail ? 1 : 0);
        const sRuleSoft =
          softTotal > 0 ? Math.max(0, 1 - Math.min(0.4, warnCount * 0.1)) : 1;

        // Evidence sufficiency from signals
        let evidenceSuff = 0.7;
        if (typeof signalsInternal.duration === "number") evidenceSuff += 0.1;
        if (typeof signalsInternal.mode === "string") evidenceSuff += 0.1;
        if (signalsInternal.afterHours) evidenceSuff += 0.1;
        evidenceSuff = Math.max(0, Math.min(1, evidenceSuff));

        // Margin bonus
        let marginBonus = 0;
        const threshold = original?.time_threshold ?? undefined;
        if (
          threshold &&
          typeof signalsInternal.duration === "number" &&
          signalsInternal.duration > threshold
        ) {
          const delta = Math.max(0, signalsInternal.duration - threshold);
          const marginCap = Number.isFinite(
            Number(process.env.SUGGEST_MARGIN_MAX)
          )
            ? Number(process.env.SUGGEST_MARGIN_MAX)
            : 0.25;
          marginBonus = Math.max(
            0,
            Math.min(marginCap, (delta / 60) * marginCap)
          );
        }

        // Softer heuristics
        let score = Math.max(0, Math.min(1, baseSim + marginBonus));
        // Hard cap only when clearly blocked; otherwise a softer cap
        if (blocked) score = Math.min(score, 0.25);
        else if (anyFail) score = Math.min(score, 0.5);
        // gentler warn decay and higher evidence baseline
        const warnDecay = Number.isFinite(
          Number(process.env.SUGGEST_WARN_DECAY)
        )
          ? Number(process.env.SUGGEST_WARN_DECAY)
          : 0.09;
        const warnMax = Number.isFinite(Number(process.env.SUGGEST_WARN_MAX))
          ? Number(process.env.SUGGEST_WARN_MAX)
          : 0.35;
        const sRuleSoft2 =
          softTotal > 0
            ? Math.max(0, 1 - Math.min(warnMax, warnCount * warnDecay))
            : 1;
        const evidenceBase = 0.8; // was 0.7
        let evidenceSuff2 = evidenceBase;
        if (typeof signalsInternal.duration === "number") evidenceSuff2 += 0.08;
        if (typeof signalsInternal.mode === "string") evidenceSuff2 += 0.06;
        if (signalsInternal.afterHours) evidenceSuff2 += 0.06;
        evidenceSuff2 = Math.max(0, Math.min(1, evidenceSuff2));
        const penaltiesWeight = Number.isFinite(
          Number(process.env.SUGGEST_PENALTY_WEIGHT)
        )
          ? Number(process.env.SUGGEST_PENALTY_WEIGHT)
          : 0.8;
        score =
          score *
          (0.75 + 0.25 * sRuleSoft2) *
          (0.75 + 0.25 * evidenceSuff2) *
          (1 - Math.max(0, Math.min(1, (penalties ?? 0) * penaltiesWeight)));
        // sharper sigmoid and shifted center for larger separation
        const k = Number.isFinite(Number(process.env.SUGGEST_SIGMOID_K))
          ? Number(process.env.SUGGEST_SIGMOID_K)
          : 4.5;
        const center = Number.isFinite(
          Number(process.env.SUGGEST_SIGMOID_CENTER)
        )
          ? Number(process.env.SUGGEST_SIGMOID_CENTER)
          : 0.42;
        const confidence = Math.max(
          0,
          Math.min(1, 1 / (1 + Math.exp(-k * (score - center))))
        );

        return {
          ...c,
          feature_hits: featureHits,
          short_explain: original?.match_reason || c.short_explain || "",
          rule_results: ruleResults,
          compliance,
          riskBanner,
          blocked,
          penalties,
          warnings,
          score: baseSim,
          confidence,
          semantic: bm25,
        } as any;
      });
      const explained = withRules.map((c) => this.explainer.explain(c));
      // Sort by computed confidence (desc), fallback to score
      explained.sort((a: any, b: any) => {
        const ca =
          typeof a.confidence === "number"
            ? a.confidence
            : typeof a.score === "number"
              ? a.score
              : 0;
        const cb =
          typeof b.confidence === "number"
            ? b.confidence
            : typeof b.score === "number"
              ? b.score
              : 0;
        if (cb !== ca) return cb - ca;
        const sa = typeof a.score === "number" ? a.score : 0;
        const sb = typeof b.score === "number" ? b.score : 0;
        if (sb !== sa) return sb - sa;
        return String(a.code).localeCompare(String(b.code));
      });

      const response: SuggestResponse = {
        candidates: explained,
        signals: {
          duration: signalsInternal.duration ?? Date.now() - started,
          mode: signalsInternal.mode,
          after_hours: signalsInternal.afterHours,
          chronic: signalsInternal.chronic,
        },
      };

      this.metrics.recordRequest(Date.now() - started, {
        lowConfidence: (response.candidates || []).some(
          (c) => (c.confidence ?? c.score ?? 1) < 0.35
        ),
      });
      return response;
    } catch (error) {
      this.logger.error("Error in suggest service:", error);
      const fallback: SuggestCandidate[] = [];
      const resp = {
        candidates: fallback,
        signals: {
          duration: Date.now() - started,
          mode: "fast",
          after_hours: false,
          chronic: false,
        },
      };
      this.metrics.recordRequest(Date.now() - started, { lowConfidence: true });
      return resp;
    }
  }
}
