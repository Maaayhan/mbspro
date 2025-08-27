export interface EvidenceSpan {
  field: string;
  text: string;
  start: number;
  end: number;
}

export interface ExtractedEpisode {
  encounterType?: string; // gp | specialist | imaging | pathology | procedure | telehealth
  location?: 'clinic' | 'home' | 'nursing_home' | 'hospital' | 'telehealth';
  hoursBucket?: 'business' | 'after_hours' | 'public_holiday';
  durationMin?: number;
  telehealthMode?: 'video' | 'phone' | 'telehealth' | 'in_person';
  reportPresent?: boolean;
  referralPresent?: boolean;
  ageYears?: number;
  procedures?: Array<{ name: string; withReport?: boolean; evidence?: EvidenceSpan[] }>;
  testsPresent?: string[];
  temporalHints?: string[];
  negations?: string[];
  evidence: EvidenceSpan[];
}

export interface KBItem {
  item: string;
  title: string;
  description: string;
  eligibility: string[];
  restrictions?: string[];
  category?: string; // gp | specialist | imaging | pathology | procedure | telehealth
  updated_at?: string;
}

export type RuleKind =
  | 'eligibility_required'
  | 'same_day_exclusive'
  | 'forbid_with'
  | 'require_report'
  | 'min_duration_by_level'
  | 'location_must_be';

export interface RuleEntry {
  id: string;
  kind: RuleKind;
  applies_to: string[]; // item codes
  parameters?: Record<string, any>;
  notes?: string;
  hard?: boolean; // hard gate or soft
}

export interface RuleResultEval {
  rule_id: string;
  pass: boolean;
  hard: boolean;
  because: string;
}

export interface RuleEvalSummary {
  pass: boolean; // all hard pass
  failed_rules: RuleResultEval[];
  s_rule_hard: 0 | 1; // 1 if any hard failed
  s_rule_soft: number; // 0..1 proportion of soft satisfied
  penalty_conflicts: number; // 0..1
  margins?: Record<string, number>;
}

export interface MbsCodesRequestDTO {
  episode_id?: string;
  note_text: string;
  attachments?: Array<{ type: string; text: string }>;
  options?: { top_k?: number; return_spans?: boolean };
}

export interface MbsCodesItemDTO {
  item: string;
  title: string;
  confidence: number; // 0..1
  reasoning: string;
  evidence: EvidenceSpan[];
  rule_results: RuleResultEval[];
}

export interface MbsCodesResponseDTO {
  items: MbsCodesItemDTO[];
  low_confidence_message?: string;
  meta: {
    prompt_version?: string;
    rules_version?: string;
    duration_ms: number;
    pipeline_flags?: Record<string, any>;
  };
}
