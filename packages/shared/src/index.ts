/**
 * Shared TypeScript type definitions for MBSPro
 * These types are used across frontend and backend applications
 */

// Request types
export interface SuggestRequest {
  note: string;
  topN?: number;
  // Optional compliance context from client/UI
  selectedCodes?: string[];
  lastClaimedItems?: Array<{ code: string; at: string }>;
  providerType?: 'GP' | 'Registrar' | 'NP' | 'Specialist';
  location?: 'clinic' | 'home' | 'nursing_home' | 'hospital';
  referralPresent?: boolean;
  consultStart?: string; // ISO
  consultEnd?: string;   // ISO
  hoursBucket?: 'business' | 'after_hours' | 'public_holiday';
}

// Response types
export interface SuggestCandidate {
  code: string;
  title: string;
  score: number;
  confidence?: number;
  score_breakdown?: Record<string, number>;
  feature_hits?: string[];
  short_explain?: string;
  // Rules engine outputs
  rule_results?: RuleResult[];
  compliance?: 'green' | 'amber' | 'red';
  // Optional risk banner, mirrors compliance but reserved for richer UIs
  riskBanner?: 'green' | 'amber' | 'red';
  // Item-level verdict
  blocked?: boolean;
  penalties?: number; // applied to score
  warnings?: string[];
}

// RAG API types
export interface RagRequest {
  query: string;
  top?: number;
}

export interface RagResult {
  itemNum?: string;
  itemNums?: string[];
  title: string;
  match_reason: string;
  match_score: number;
  fee: string;
  benefit: string;
}

export interface RagResponse {
  results: RagResult[];
}

export interface Signals {
  duration: number;
  mode: string;
  after_hours: boolean;
  chronic: boolean;
}

export interface SuggestResponse {
  candidates: SuggestCandidate[];
  signals?: Signals;
}

// Rule processing types
export interface RuleResult {
  id: string;
  // status remains for backward compatibility: 'pass' | 'warn' | 'fail'
  status: string;
  reason: string;
  refs?: string[];
  // Optional richer fields for DSL-based engine
  severity?: 'info' | 'warn' | 'error';
  evidence?: any;
}

// -----------------------------
// Signal extraction (EN/ZH)
// -----------------------------
export const SIGNAL_SYNONYMS = {
  telehealth: [
    'telehealth', 'telemedicine', 'remote consult', 'virtual',
    '远程会诊', '远程问诊', '线上问诊', '线上就诊', '线上'
  ],
  video: [
    'video', 'video consult', 'video call', 'zoom', 'teams', 'facetime',
    '视频', '视频问诊', '视频通话', '视讯'
  ],
  phone: [
    'phone', 'telephone', 'call', 'phone consult',
    '电话', '致电', '电话问诊'
  ],
  in_person: [
    'in person', 'face-to-face', 'face to face', 'clinic visit', 'office visit',
    '面诊', '线下', '当面'
  ],
  after_hours: [
    'after-hours', 'after hours', 'out of hours', 'ooh', 'oohs', 'evening', 'weekend',
    '下班后', '非工作时间', '夜间', '夜诊', '节假日'
  ],
  chronic: [
    'chronic', 'long-term', 'long term', 'ongoing', 'follow-up', 'follow up', 'review',
    '慢性', '长期', '复诊', '随访', '复查'
  ],
  duration_units: [
    'min', 'mins', 'minute', 'minutes', 'm', '分钟', '分', '小时', 'h', 'hr', 'hrs'
  ],
} as const;

function includesAny(text: string, list: readonly string[]): boolean {
  return list.some((w) => text.includes(w));
}

function parseDurationMinutes(text: string): number {
  // English numeric minutes: 20 min, 45mins, 10 m
  const numMin = /\b(\d{1,3})\s*(minutes?|mins?|m)\b/i.exec(text);
  if (numMin) return Math.min(480, parseInt(numMin[1], 10));

  // English hours: 1h, 2 hr, 1.5 hours
  const numHr = /\b(\d{1,2}(?:\.\d+)?)\s*(hours?|hrs?|h)\b/i.exec(text);
  if (numHr) return Math.min(480, Math.round(parseFloat(numHr[1]) * 60));

  // Chinese minutes: 20分钟, 30分
  const zhMin = /(\d{1,3})\s*(分钟|分)/.exec(text);
  if (zhMin) return Math.min(480, parseInt(zhMin[1], 10));

  // Chinese hours: 1小时, 1.5小时
  const zhHr = /(\d{1,2}(?:\.\d+)?)\s*小时/.exec(text);
  if (zhHr) return Math.min(480, Math.round(parseFloat(zhHr[1]) * 60));

  // Chinese special: 半小时 ≈ 30
  if (text.includes('半小时')) return 30;

  return 0;
}

export function extractSignals(note: string): Signals {
  const text = (note || '').toLowerCase();

  // Mode priority: video > phone > telehealth > in-person
  let mode = 'in-person';
  if (includesAny(text, SIGNAL_SYNONYMS.video)) mode = 'video';
  else if (includesAny(text, SIGNAL_SYNONYMS.phone)) mode = 'phone';
  else if (includesAny(text, SIGNAL_SYNONYMS.telehealth)) mode = 'telehealth';
  else if (includesAny(text, SIGNAL_SYNONYMS.in_person)) mode = 'in-person';

  const afterHours = includesAny(text, SIGNAL_SYNONYMS.after_hours);
  const chronic = includesAny(text, SIGNAL_SYNONYMS.chronic);
  const duration = parseDurationMinutes(text);

  return {
    duration,
    mode,
    after_hours: afterHours,
    chronic,
  };
}