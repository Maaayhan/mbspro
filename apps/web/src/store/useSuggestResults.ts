'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type SuggestCandidate = {
  code: string;
  title: string;
  score: number;
  score_breakdown?: Record<string, number>;
  feature_hits?: string[];
  short_explain?: string;
  rule_results?: Array<{ id: string; status: string; reason: string; refs?: string[] }>;
  compliance?: 'green' | 'amber' | 'red';
  confidence?: number;
  semantic?: number;
};

type SuggestResultsState = {
  candidates: SuggestCandidate[];
  updatedAt?: number;
  note?: string;
  setCandidates: (cs: SuggestCandidate[]) => void;
  setNote: (note: string) => void;
  getByCode: (code: string) => SuggestCandidate | undefined;
};

export const useSuggestResults = create<SuggestResultsState>()(
  persist(
    (set, get) => ({
      candidates: [],
      updatedAt: undefined,
      note: undefined,
      setCandidates: (cs) => set({ candidates: cs || [], updatedAt: Date.now() }),
      setNote: (note) => set({ note, updatedAt: Date.now() }),
      getByCode: (code) => (get().candidates || []).find(c => String(c.code) === String(code)),
    }),
    { name: 'mbspro-suggest-results' }
  )
);


