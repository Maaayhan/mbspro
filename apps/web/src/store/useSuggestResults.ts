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
  setCandidates: (cs: SuggestCandidate[]) => void;
  getByCode: (code: string) => SuggestCandidate | undefined;
  clearCandidates: () => void;
  clear: () => void;
};

export const useSuggestResults = create<SuggestResultsState>()(
  persist(
    (set, get) => ({
      candidates: [],
      updatedAt: undefined,
      setCandidates: (cs) => set({ candidates: cs || [], updatedAt: Date.now() }),
      getByCode: (code) => (get().candidates || []).find(c => String(c.code) === String(code)),
      clearCandidates: () => set({ candidates: [], updatedAt: Date.now() }),
      clear: () => set({ candidates: [], updatedAt: undefined }),
    }),
    { 
      name: 'mbspro-suggest-results',
      // only persist candidates and updatedAt, not note
      partialize: (state) => ({ 
        candidates: state.candidates, 
        updatedAt: state.updatedAt 
      }),
    }
  )
);


