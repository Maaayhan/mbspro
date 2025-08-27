import { Injectable } from '@nestjs/common';
import type { SuggestCandidate } from '@mbspro/shared';
import { ExtractedSignalsInternal } from './signal-extractor.service';

export interface RankerWeights {
  alpha?: number; // weight for bm25
  beta?: number;  // weight for features sum
  w1?: number;    // telehealth match boost
  w2?: number;    // telehealth mismatch penalty
  w3?: number;    // after-hours match boost
  w4?: number;    // duration >= threshold boost
  w5?: number;    // duration < threshold penalty
  w6?: number;    // chronic category boost
}

export interface RankRow {
  code: string;
  title: string;
  description: string;
  flags: Record<string, any>;
  time_threshold?: number;
  sim?: number; // bm25-like normalized similarity 0..1
}

interface RankInput {
  rows: RankRow[];
  signals: ExtractedSignalsInternal;
  topN: number;
  weights?: RankerWeights;
}

const DEFAULT_WEIGHTS: Required<RankerWeights> = {
  alpha: 0.7,
  beta: 0.3,
  w1: 0.25,
  w2: 0.15,
  w3: 0.20,
  w4: 0.15,
  w5: 0.10,
  w6: 0.10,
};

@Injectable()
export class RankerService {
  rank({ rows, signals, topN, weights }: RankInput): SuggestCandidate[] {
    const w = { ...DEFAULT_WEIGHTS, ...(weights || {}) } as Required<RankerWeights>;
    // Compute raw scores first
    const rawCandidates = rows.map((row) => {
      const bm25 = Math.max(0, Math.min(1, row.sim ?? 0));
      const features: Record<string, number> = {};
      const hits: string[] = [];

      // telehealth
      const itemTelehealth = !!(row.flags && (row.flags.telehealth === true));
      if ((signals.mode === 'telehealth' || signals.mode === 'video' || signals.mode === 'phone')) {
        if (itemTelehealth) {
          features.telehealth = w.w1;
          hits.push('telehealth');
        } else {
          features.telehealth_mismatch = -w.w2;
        }
      }

      // after-hours
      const itemAfterHours = !!(row.flags && (row.flags.after_hours === true));
      if (signals.afterHours) {
        if (itemAfterHours) {
          features.after_hours = w.w3;
          hits.push('after_hours');
        }
      }

      // duration vs threshold
      const threshold = row.time_threshold ?? undefined;
      if (threshold && threshold > 0 && signals.duration !== undefined) {
        if (signals.duration >= threshold) {
          features.duration_threshold = w.w4;
          hits.push('time_threshold');
        } else {
          features.duration_short = -w.w5;
        }
      }

      // chronic category via keywords/tags
      const isChronicCategory = /chronic|care[- ]?plan|长期|慢性/i.test(`${row.title} ${row.description}`);
      if (signals.chronic && isChronicCategory) {
        features.chronic = w.w6;
        hits.push('chronic');
      }

      const featureSum = Object.values(features).reduce((a, b) => a + b, 0);
      const score = w.alpha * bm25 + w.beta * featureSum;

      return {
        code: row.code,
        title: row.title,
        score,
        score_breakdown: { bm25 },
        feature_hits: hits,
        short_explain: '',
      } as SuggestCandidate;
    });

    // Normalize scores to [0,1]
    const scores = rawCandidates.map((c) => c.score);
    const minScore = Math.min(...scores);
    const maxScore = Math.max(...scores);
    const range = maxScore - minScore;

    const candidates = rawCandidates.map((c) => {
      const raw = c.score;
      const normalized = range > 0 ? (raw - minScore) / range : 1;
      // Confidence heuristic: combine normalized score with rule quality later (placeholder)
      const confidence = Math.max(0, Math.min(1, normalized));
      return {
        ...c,
        score: Math.max(0, Math.min(1, normalized)),
        score_breakdown: { bm25: (c as any).score_breakdown?.bm25 ?? 0, score_raw: raw },
        confidence,
      } as SuggestCandidate;
    });

    candidates.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      // tie-break by ascending code (lexicographic)
      return String(a.code).localeCompare(String(b.code));
    });

    return candidates.slice(0, Math.max(1, topN));
  }
}
