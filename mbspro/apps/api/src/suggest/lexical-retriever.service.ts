import { Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from '../services/supabase.service';
import { ExtractedSignalsInternal } from './signal-extractor.service';

export interface LexicalCandidate {
  code: string;
  title: string;
  description: string;
  flags: Record<string, any>;
  time_threshold?: number;
  bm25: number; // normalized similarity score 0..1
}

@Injectable()
export class LexicalRetrieverService {
  private readonly logger = new Logger(LexicalRetrieverService.name);

  constructor(private readonly supabase: SupabaseService) {}

  buildQueryFromSignals(note: string, signals: ExtractedSignalsInternal): string {
    const terms: string[] = [];
    const text = (note || '').toLowerCase();

    // Base keywords from note (simple tokenization: words >= 3 chars)
    const baseTokens = Array.from(new Set(text.split(/[^a-z0-9一-龥]+/i).filter(t => t && t.length >= 3))).slice(0, 10);
    terms.push(...baseTokens);

    // Signals
    if (signals.telehealth || signals.mode === 'telehealth' || signals.mode === 'video' || signals.mode === 'phone') {
      terms.push('telehealth', 'video', 'phone');
    }
    if (signals.afterHours) {
      terms.push('after hours', 'after-hours');
    }
    if (signals.chronic) {
      terms.push('chronic', 'review', 'follow up');
    }

    // De-duplicate and join
    const unique = Array.from(new Set(terms)).filter(Boolean);
    return unique.join(' ');
  }

  async retrieve(note: string, signals: ExtractedSignalsInternal, k: number = 30): Promise<LexicalCandidate[]> {
    const client = this.supabase.getClient();
    const q = this.buildQueryFromSignals(note, signals);

    try {
      const limit = Math.max(k, 10);
      const { data, error } = await client.rpc('search_mbs_items', { q, limit_n: limit });
      if (error) {
        this.logger.error('Supabase RPC search_mbs_items failed', error);
        return [];
      }
      const rows = (data as any[]) || [];

      // Normalize similarity to 0..1 as bm25 proxy
      const maxSim = rows.reduce((m, r) => Math.max(m, r.sim ?? 0), 0) || 1;
      return rows.map((r) => ({
        code: r.code,
        title: r.title,
        description: r.description ?? '',
        flags: r.flags ?? {},
        time_threshold: r.time_threshold ?? undefined,
        bm25: Math.max(0, Math.min(1, (r.sim ?? 0) / maxSim)),
      })).slice(0, k);
    } catch (e) {
      this.logger.error('LexicalRetriever error', e);
      return [];
    }
  }
}
