/**
 * Shared TypeScript type definitions for MBSPro
 * These types are used across frontend and backend applications
 */

// Request types
export interface SuggestRequest {
  note: string;
  topN?: number;
}

// Response types
export interface SuggestCandidate {
  code: string;
  title: string;
  score: number;
  score_breakdown?: Record<string, number>;
  feature_hits?: string[];
  short_explain?: string;
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
  status: string;
  reason: string;
  refs?: string[];
}
