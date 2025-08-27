import { Injectable } from '@nestjs/common';
import type { RuleResult } from '@mbspro/shared';

interface NoteFacts {
  mode: string;
  after_hours: boolean;
  chronic: boolean;
  duration: number;
  keywords?: string[];
}

interface ItemFacts {
  code: string;
  time_threshold?: number;
  flags: Record<string, any>;
  mutually_exclusive_with: string[];
}

interface EvalContext {
  selected_codes: string[];
}

interface EvaluateInput {
  note: NoteFacts;
  item: ItemFacts;
  context: EvalContext;
}

@Injectable()
export class RuleEngineService {
  evaluate(input: EvaluateInput): { ruleResults: RuleResult[]; compliance: 'green' | 'amber' | 'red' } {
    const results: RuleResult[] = [];

    // Rule: Time threshold
    if (typeof input.item.time_threshold === 'number' && input.item.time_threshold > 0) {
      if (input.note.duration >= input.item.time_threshold) {
        results.push({
          id: 'time_threshold',
          status: 'pass',
          reason: `Duration ${input.note.duration} min ≥ required ${input.item.time_threshold} min`,
        });
      } else {
        results.push({
          id: 'time_threshold',
          status: 'fail',
          reason: `Requires minimum ${input.item.time_threshold} minutes (got ${input.note.duration})`,
        });
      }
    }

    // Rule: Telehealth context match
    const itemTelehealth = !!(input.item.flags && input.item.flags.telehealth === true);
    if (itemTelehealth) {
      const teleMode = input.note.mode === 'telehealth' || input.note.mode === 'video' || input.note.mode === 'phone';
      if (teleMode) {
        results.push({ id: 'telehealth', status: 'pass', reason: 'Telehealth context satisfied.' });
      } else {
        results.push({ id: 'telehealth', status: 'fail', reason: 'Telehealth mode required.' });
      }
    }

    // Rule: After-hours context
    const itemAfterHours = !!(input.item.flags && input.item.flags.after_hours === true);
    if (itemAfterHours) {
      if (input.note.after_hours) {
        results.push({ id: 'after_hours', status: 'pass', reason: 'After-hours context satisfied.' });
      } else {
        results.push({ id: 'after_hours', status: 'fail', reason: 'After-hours required.' });
      }
    }

    // Rule: Mutual exclusivity (warn if any overlap with selected codes)
    if (Array.isArray(input.item.mutually_exclusive_with) && input.item.mutually_exclusive_with.length > 0) {
      const overlap = (input.item.mutually_exclusive_with || []).filter((c) => input.context.selected_codes.includes(String(c)));
      if (overlap.length > 0) {
        results.push({ id: 'mutually_exclusive', status: 'warn', reason: `Mutually exclusive with selected: ${overlap.join(', ')}` });
      }
    }

    // Aggregate compliance: any fail => red; else any warn => amber; else green
    let compliance: 'green' | 'amber' | 'red' = 'green';
    if (results.some((r) => r.status === 'fail')) compliance = 'red';
    else if (results.some((r) => r.status === 'warn')) compliance = 'amber';

    return { ruleResults: results, compliance };
  }
}


