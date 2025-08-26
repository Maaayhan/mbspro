export interface SuggestCandidate {
  code: string;
  title: string;
  score: number;
  score_breakdown?: Record<string, number>;
  feature_hits?: string[];
  short_explain?: string;
  status?: "PASS" | "WARN" | "FAIL"; // added for rule engine
}
