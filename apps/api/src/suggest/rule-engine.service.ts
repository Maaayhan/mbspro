import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
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
  last_claimed_items?: Array<{ code: string; at: string }>;
  provider_type?: 'GP' | 'Registrar' | 'NP' | 'Specialist' | string;
  location?: 'clinic' | 'home' | 'nursing_home' | 'hospital' | string;
  referral_present?: boolean;
  hours_bucket?: 'business' | 'after_hours' | 'public_holiday' | string;
  consult_start?: string;
  consult_end?: string;
  now_iso?: string;
}

interface EvaluateInput {
  note: NoteFacts;
  item: ItemFacts;
  context: EvalContext;
}

@Injectable()
export class RuleEngineService {
  private rulesByCode: Map<string, any> = new Map();

  constructor() {
    this.loadNormalizedRules();
  }

  private loadNormalizedRules(): void {
    try {
      const rulesPath = process.env.MBS_RULES_JSON || path.resolve(__dirname, 'mbs_rules.normalized.json');
      if (!fs.existsSync(rulesPath)) return;
      const raw = fs.readFileSync(rulesPath, 'utf8');
      const arr = JSON.parse(raw);
      if (Array.isArray(arr)) {
        const m = new Map<string, any>();
        for (const it of arr) {
          const code = String((it && it.code) || '');
          if (code) m.set(code, it);
        }
        this.rulesByCode = m;
      }
    } catch {
      // ignore
    }
  }
  evaluate(input: EvaluateInput): { ruleResults: RuleResult[]; compliance: 'green' | 'amber' | 'red'; blocked?: boolean; penalties?: number; warnings?: string[] } {
    const results: RuleResult[] = [];
    let blocked = false;
    let penalties = 0;
    const warnings: string[] = [];

    // Resolve item facts from normalized rules if available
    const normalized = this.rulesByCode.get(String(input.item.code));
    const flags = (normalized && normalized.flags) || input.item.flags || {};
    const conditions: any[] = Array.isArray(normalized?.conditions) ? normalized.conditions : [];

    // Rule: Time threshold (supports min and max when available)
    const thr = (normalized && normalized.timeThreshold) || undefined;
    if (thr && (typeof thr.minMinutes === 'number' || typeof thr.maxMinutes === 'number')) {
      const d = input.note.duration;
      let pass = true;
      const parts: string[] = [];
      if (typeof thr.minMinutes === 'number') {
        const meetsMin = thr.includeMin !== false ? d >= thr.minMinutes : d > thr.minMinutes;
        pass = pass && meetsMin;
        parts.push(`${thr.includeMin !== false ? '≥' : '>'} ${thr.minMinutes}`);
      }
      if (typeof thr.maxMinutes === 'number') {
        const meetsMax = thr.includeMax === true ? d <= thr.maxMinutes : d < thr.maxMinutes;
        pass = pass && meetsMax;
        parts.push(`${thr.includeMax === true ? '≤' : '<'} ${thr.maxMinutes}`);
      }
      results.push({
        id: 'time_threshold',
        status: pass ? 'pass' : 'fail',
        reason: `Duration ${d} min must satisfy ${parts.join(' and ')}`,
        severity: pass ? 'info' : 'error',
        evidence: { durationMinutes: d, threshold: thr },
      });
    } else if (typeof input.item.time_threshold === 'number' && input.item.time_threshold > 0) {
      // Fallback to legacy single threshold
      if (input.note.duration >= input.item.time_threshold) {
        results.push({ id: 'time_threshold', status: 'pass', reason: `Duration ${input.note.duration} min ≥ required ${input.item.time_threshold} min`, severity: 'info', evidence: { durationMinutes: input.note.duration, minMinutes: input.item.time_threshold } });
      } else {
        results.push({ id: 'time_threshold', status: 'fail', reason: `Requires minimum ${input.item.time_threshold} minutes (got ${input.note.duration})`, severity: 'error', evidence: { durationMinutes: input.note.duration, minMinutes: input.item.time_threshold } });
      }
    }

    // Rule: Telehealth context match
    const itemTelehealth = !!(flags && flags.telehealth === true);
    if (itemTelehealth) {
      const teleMode = input.note.mode === 'telehealth' || input.note.mode === 'video' || input.note.mode === 'phone';
      if (teleMode) {
        results.push({ id: 'telehealth', status: 'pass', reason: 'Telehealth context satisfied.', severity: 'info', evidence: { mode: input.note.mode, acceptable: ['telehealth','video','phone'] } });
      } else {
        results.push({ id: 'telehealth', status: 'fail', reason: 'Telehealth mode required.', severity: 'error', evidence: { mode: input.note.mode, acceptable: ['telehealth','video','phone'] } });
        blocked = true;
      }
    }

    // Rule: After-hours context
    const itemAfterHours = !!(flags && flags.after_hours === true);
    if (itemAfterHours) {
      const afterHoursByBucket = input.context.hours_bucket ? input.context.hours_bucket === 'after_hours' : undefined;
      const afterHours = typeof afterHoursByBucket === 'boolean' ? afterHoursByBucket : input.note.after_hours;
      if (afterHours) {
        results.push({ id: 'after_hours', status: 'pass', reason: 'After-hours context satisfied.', severity: 'info', evidence: { hoursBucket: 'after_hours', source: typeof afterHoursByBucket === 'boolean' ? 'request' : 'extracted' } });
      } else {
        const hb = input.context.hours_bucket && typeof afterHoursByBucket === 'boolean' ? input.context.hours_bucket : 'business';
        results.push({ id: 'after_hours', status: 'fail', reason: 'After-hours required.', severity: 'error', evidence: { hoursBucket: hb, source: typeof afterHoursByBucket === 'boolean' ? 'request' : 'extracted' } });
        blocked = true;
      }
    }

    // Rule: Telehealth video required
    const videoRequired = !!(flags && flags.video_required === true) || (Array.isArray(normalized?.conditions) && normalized.conditions.some((c: any) => c && c.kind === 'telehealth_video_required' && c.value === true));
    if (videoRequired && itemTelehealth) {
      const passed = input.note.mode === 'video';
      results.push({ id: 'telehealth_video_required', status: passed ? 'pass' : 'fail', reason: passed ? 'Video modality satisfied.' : 'Video modality required for this item.', severity: passed ? 'info' : 'error', evidence: { mode: input.note.mode } });
      if (!passed) blocked = true;
    }

    // Rule: Mutual exclusivity (warn if any overlap with selected codes)
    const mutuallyExclusive = Array.isArray(normalized?.mutuallyExclusiveWith) ? normalized.mutuallyExclusiveWith.map(String) : (input.item.mutually_exclusive_with || []);
    if (Array.isArray(mutuallyExclusive) && mutuallyExclusive.length > 0) {
      const overlap = mutuallyExclusive.filter((c: string) => input.context.selected_codes.includes(String(c)));
      if (overlap.length > 0) {
        results.push({ id: 'mutually_exclusive', status: 'warn', reason: `Mutually exclusive with selected: ${overlap.join(', ')}`, severity: 'warn', evidence: { overlap } });
        warnings.push(`Mutually exclusive with: ${overlap.join(', ')}`);
        penalties += 0.05 * overlap.length; // small penalty per overlap
      }
    }

    // Rule: Frequency limits (normalized.frequencyLimits)
    const freq = normalized && normalized.frequencyLimits;
    if (freq && typeof freq.max === 'number' && freq.max > 0) {
      const history = Array.isArray(input.context.last_claimed_items) ? input.context.last_claimed_items : [];
      const combinedWith: string[] = Array.isArray(freq.combinedWith) ? freq.combinedWith.map(String) : [];
      const relevantCodes = new Set<string>([String(input.item.code), ...combinedWith.map(String)]);
      const refIso = input.context.consult_end || input.context.now_iso || new Date().toISOString();
      const ref = new Date(refIso);
      let windowStart: Date | null = null;
      let windowEnd: Date | null = null;
      if (freq.scope === 'rolling_months' && typeof freq.months === 'number' && freq.months > 0) {
        windowEnd = ref;
        const ws = new Date(ref);
        ws.setMonth(ws.getMonth() - freq.months);
        windowStart = ws;
      } else if (freq.scope === 'calendar_year') {
        const y = ref.getFullYear();
        windowStart = new Date(Date.UTC(y, 0, 1, 0, 0, 0));
        windowEnd = new Date(Date.UTC(y, 11, 31, 23, 59, 59));
      }
      const inWindow = history.filter((h) => {
        const code = String(h.code);
        if (!relevantCodes.has(code)) return false;
        const t = new Date(h.at);
        if (windowStart && t < windowStart) return false;
        if (windowEnd && t > windowEnd) return false;
        return true;
      });
      const count = inWindow.length;
      const pass = count < freq.max;
      results.push({
        id: 'frequency_limits',
        status: pass ? 'pass' : 'fail',
        reason: pass ? `Within frequency limit (used ${count}/${freq.max}).` : `Frequency exceeded (used ${count}/${freq.max}).`,
        severity: pass ? 'info' : 'error',
        evidence: { scope: freq.scope, months: freq.months, max: freq.max, combinedWith: combinedWith, windowStart: windowStart?.toISOString(), windowEnd: windowEnd?.toISOString(), matches: inWindow },
      });
      if (!pass) blocked = true;
    }

    // Rule: Location constraints via flags
    const loc: string | undefined = input.context.location;
    if (loc) {
      if (flags.consulting_rooms_only === true) {
        const ok = loc === 'clinic';
        results.push({ id: 'location_consulting_rooms_only', status: ok ? 'pass' : 'fail', reason: ok ? 'Clinic location satisfied.' : 'Must be at consulting rooms (clinic).', severity: ok ? 'info' : 'error', evidence: { location: loc } });
        if (!ok) blocked = true;
      }
      if (flags.hospital_only === true) {
        const ok = loc === 'hospital';
        results.push({ id: 'location_hospital_only', status: ok ? 'pass' : 'fail', reason: ok ? 'Hospital location satisfied.' : 'Must be at hospital.', severity: ok ? 'info' : 'error', evidence: { location: loc } });
        if (!ok) blocked = true;
      }
      if (flags.residential_care === true) {
        const ok = loc === 'nursing_home';
        results.push({ id: 'location_residential_care', status: ok ? 'pass' : 'fail', reason: ok ? 'Residential care (nursing home) satisfied.' : 'Requires residential aged care setting.', severity: ok ? 'info' : 'error', evidence: { location: loc } });
        if (!ok) blocked = true;
      }
    }

    // Rule: Referral required (conditions)
    const needsReferral = conditions.some((c) => c && c.kind === 'referral_required');
    if (needsReferral) {
      const present = input.context.referral_present === true;
      results.push({ id: 'referral_required', status: present ? 'pass' : 'fail', reason: present ? 'Referral present.' : 'Referral required but not present.', severity: present ? 'info' : 'error', evidence: { referralPresent: present } });
    }

    // Rule: Specialty requirement (informational unless contradicted)
    const specialtyCond = conditions.find((c) => c && c.kind === 'specialty');
    if (specialtyCond && specialtyCond.value) {
      const pt = input.context.provider_type;
      const status = pt === 'Specialist' ? 'pass' : 'warn';
      results.push({ id: 'specialty_required', status, reason: `Requires specialty: ${String(specialtyCond.value)}.`, severity: status === 'pass' ? 'info' : 'warn', evidence: { providerType: pt, requiredSpecialty: specialtyCond.value } });
    }

    // Rule: requiredElements (care plan/assessment elements completeness)
    const reqElem = conditions.find((c) => c && c.kind === 'requiredElements');
    if (reqElem && Array.isArray(reqElem.elements)) {
      const elems: string[] = reqElem.elements.map((e: any) => String(e).toLowerCase());
      const textBag = (input.note.keywords || []).map((k) => String(k).toLowerCase());
      const present = new Set<string>();
      for (const e of elems) {
        // loose matching on synonyms
        const synonyms: Record<string, string[]> = {
          problems: ['problems', 'problem list', 'issues'],
          goals: ['goals', 'targets', 'objectives'],
          actions: ['actions', 'interventions', 'plan'],
          reviewplan: ['review plan', 'reviewplan', 'follow up']
        };
        const key = e.replace(/\s+/g, '');
        const syns = synonyms[key] || [e];
        if (textBag.some((w) => syns.some((s) => w.includes(s)))) {
          present.add(e);
        }
      }
      const missing = elems.filter((e: string) => !present.has(e));
      const ok = missing.length === 0;
      results.push({ id: 'required_elements', status: ok ? 'pass' : 'warn', reason: ok ? 'Required elements present.' : `Missing elements: ${missing.join(', ')}`, severity: ok ? 'info' : 'warn', evidence: { required: elems, missing } });
      if (!ok) {
        warnings.push(`Missing elements: ${missing.join(', ')}`);
        penalties += 0.05 * missing.length;
      }
    }

    // Aggregate compliance: any fail => red; else any warn => amber; else green
    let compliance: 'green' | 'amber' | 'red' = 'green';
    if (results.some((r) => r.status === 'fail')) compliance = 'red';
    else if (results.some((r) => r.status === 'warn')) compliance = 'amber';

    return { ruleResults: results, compliance, blocked, penalties, warnings };
  }
}


