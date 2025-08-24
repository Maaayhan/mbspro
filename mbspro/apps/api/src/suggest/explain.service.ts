import { Injectable } from '@nestjs/common';
import type { SuggestCandidate, Signals } from '@mbspro/shared';

export type ExplainKey = 'telehealth' | 'after_hours' | 'time_threshold' | 'chronic';

const TEMPLATES_EN: Record<ExplainKey, string> = {
  telehealth: 'Telehealth context matches (video/phone).',
  after_hours: 'Occurs in an after-hours context.',
  time_threshold: 'Meets the minimum duration requirement.',
  chronic: 'Aligned with chronic care or care-plan context.',
};

@Injectable()
export class ExplainService {
  explain(candidate: SuggestCandidate, signals?: Signals): SuggestCandidate {
    const hits = new Set<string>(candidate.feature_hits || []);
    const keys: ExplainKey[] = [];

    // telehealth via feature or signals.mode
    if (hits.has('telehealth') || (signals && (signals.mode === 'telehealth' || signals.mode === 'video' || signals.mode === 'phone'))) {
      keys.push('telehealth');
    }

    // after-hours via feature or signals
    if (hits.has('after_hours') || (signals && signals.after_hours)) {
      keys.push('after_hours');
    }

    // time threshold via feature
    if (hits.has('time_threshold')) {
      keys.push('time_threshold');
    }

    // chronic via feature or signals
    if (hits.has('chronic') || (signals && signals.chronic)) {
      keys.push('chronic');
    }

    let shortExplain = '';
    if (keys.length > 0) {
      // Build up to 2 sentences
      const sentences: string[] = [];
      // Prioritize contextual lines first
      for (const k of keys) {
        if (sentences.length >= 2) break;
        sentences.push(TEMPLATES_EN[k]);
      }
      shortExplain = sentences.join(' ');
    }

    return { ...candidate, short_explain: shortExplain };
  }
}
