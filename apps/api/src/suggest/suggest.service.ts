import { Injectable, Logger } from '@nestjs/common';
import { SuggestRequestDto } from './dto/suggest-request.dto';
import { SuggestResponseDto } from './dto/suggest-response.dto';
import type { SuggestResponse, SuggestCandidate } from '@mbspro/shared';
import { SignalExtractorService } from './signal-extractor.service';
import { RankerService } from './ranker.service';
import { ExplainService } from './explain.service';
import { RuleEngineService } from './rule-engine.service';
import { RagService } from '../rag/rag.service';

@Injectable()
export class SuggestService {
  private readonly logger = new Logger(SuggestService.name);

  constructor(
    private readonly signalExtractor: SignalExtractorService,
    private readonly ranker: RankerService,
    private readonly explainer: ExplainService,
    private readonly rules: RuleEngineService,
    private readonly rag: RagService,
  ) {}

  async suggest(request: SuggestRequestDto): Promise<SuggestResponseDto> {
    const started = Date.now();
    const note = request.note || '';
    const topN = request.topN && request.topN > 0 ? request.topN : 5;

    try {
      const signalsInternal = this.signalExtractor.extract(note);
      const topK = Math.max(30, topN * 10);

      // RAG-only retrieval
      let rows: any[] = [];
      try {
        const rag = await this.rag.queryRag(note, Math.min(topN + 3, 15));
        if (rag && Array.isArray((rag as any).results)) {
          rows = (rag as any).results.map((r: any) => ({
            code: (r.itemNum || (Array.isArray(r.itemNums) ? (r.itemNums[0] || '') : '')),
            title: r.title || '',
            description: r.match_reason || '',
            flags: {},
            time_threshold: undefined,
            bm25: typeof r.match_score === 'number' ? Math.max(0, Math.min(1, r.match_score)) : 0,
          }));
        }
      } catch (e) {
        this.logger.warn(`RAG query failed: ${String(e)}`);
      }
      // Preserve item facts so ranker and rules can use them
      const rowsForRanker = rows.map((r) => ({
        code: r.code,
        title: r.title,
        description: r.description,
        fee: 0,
        time_threshold: r.time_threshold,
        flags: r.flags,
        mutually_exclusive_with: (r as any).mutually_exclusive_with || [],
        reference_docs: (r as any).reference_docs || [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        sim: r.bm25,
      } as any));

      const ranked = this.ranker.rank({ rows: rowsForRanker, signals: signalsInternal, topN });
      const withRules = ranked.map((c) => {
        const original = rowsForRanker.find((r) => String(r.code) === String(c.code));
        const { ruleResults, compliance, blocked, penalties, warnings } = this.rules.evaluate({
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
            selected_codes: Array.isArray((request as any).selectedCodes) ? (request as any).selectedCodes.map(String) : [],
            last_claimed_items: Array.isArray((request as any).lastClaimedItems) ? (request as any).lastClaimedItems : [],
            provider_type: (request as any).providerType,
            location: (request as any).location,
            referral_present: (request as any).referralPresent,
            hours_bucket: (request as any).hoursBucket,
            consult_start: (request as any).consultStart,
            consult_end: (request as any).consultEnd,
            now_iso: new Date().toISOString(),
          },
        });
        const riskBanner = compliance;
        // Apply penalties to score (clamped)
        const newScore = Math.max(0, Math.min(1, (c.score ?? 0) - (penalties ?? 0)));
        return { ...c, score: newScore, rule_results: ruleResults, compliance, riskBanner, blocked, penalties, warnings } as any;
      });
      const explained = withRules.map((c) => this.explainer.explain(c));

      const response: SuggestResponse = {
        candidates: explained,
        signals: {
          duration: signalsInternal.duration ?? (Date.now() - started),
          mode: signalsInternal.mode,
          after_hours: signalsInternal.afterHours,
          chronic: signalsInternal.chronic,
        },
      };

      return response;
    } catch (error) {
      this.logger.error('Error in suggest service:', error);
      const fallback: SuggestCandidate[] = [];
      return {
        candidates: fallback,
        signals: {
          duration: Date.now() - started,
          mode: 'fast',
          after_hours: false,
          chronic: false,
        },
      };
    }
  }
}
