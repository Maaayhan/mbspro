import { Injectable, Logger } from '@nestjs/common';
import { SuggestRequestDto } from './dto/suggest-request.dto';
import { SuggestResponseDto } from './dto/suggest-response.dto';
import type { SuggestResponse, SuggestCandidate } from '@mbspro/shared';
import { SignalExtractorService } from './signal-extractor.service';
import { RankerService } from './ranker.service';
import { ExplainService } from './explain.service';
import { LexicalRetrieverService } from './lexical-retriever.service';

@Injectable()
export class SuggestService {
  private readonly logger = new Logger(SuggestService.name);

  constructor(
    private readonly signalExtractor: SignalExtractorService,
    private readonly lexical: LexicalRetrieverService,
    private readonly ranker: RankerService,
    private readonly explainer: ExplainService,
  ) {}

  async suggest(request: SuggestRequestDto): Promise<SuggestResponseDto> {
    const started = Date.now();
    const note = request.note || '';
    const topN = request.topN && request.topN > 0 ? request.topN : 5;

    try {
      const signalsInternal = this.signalExtractor.extract(note);
      const topK = Math.max(30, topN * 10);
      const rows = await this.lexical.retrieve(note, signalsInternal, topK);
      // Adapt to ranker's expected shape by attaching sim as sim field
      const rowsForRanker = rows.map((r) => ({
        code: r.code,
        title: r.title,
        description: '',
        fee: 0,
        time_threshold: undefined,
        flags: {},
        mutually_exclusive_with: [],
        reference_docs: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        sim: r.bm25,
      } as any));

      const ranked = this.ranker.rank({ rows: rowsForRanker, signals: signalsInternal, topN });
      const explained = ranked.map((c) => this.explainer.explain(c));

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
