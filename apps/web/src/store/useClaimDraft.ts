"use client";
import { create } from "zustand";
import { persist } from "zustand/middleware";

export type SelectedItem = {
  code: string;
  title: string;
  fee?: string; // "$41.40"
  description?: string;
  score?: number; // optional
};

export type QuickRuleStatus = "ok" | "warning" | "fail";

export type QuickRuleResult = {
  id: string;
  name: string;
  status: QuickRuleStatus;
  reason: string;
};

export type ClaimDraft = {
  notes: string;
  selected: SelectedItem[];
  quickRules: QuickRuleResult[];
  meta?: { updatedAt: number };
};

type ClaimDraftState = {
  draft: ClaimDraft;
  setNotes: (v: string) => void;
  addItem: (it: SelectedItem) => void;
  removeItem: (code: string) => void;
  setQuickRules: (rs: QuickRuleResult[]) => void;
  clear: () => void;
};

const initial: ClaimDraft = {
  notes: "",
  selected: [],
  quickRules: [],
  meta: { updatedAt: Date.now() },
};

export const useClaimDraft = create<ClaimDraftState>()(
  persist(
    (set, get) => ({
      draft: initial,
      setNotes: (v) =>
        set((s) => ({
          draft: { ...s.draft, notes: v, meta: { updatedAt: Date.now() } },
        })),
      addItem: (it) =>
        set((s) => {
          if (s.draft.selected.some((x) => x.code === it.code)) return s; // dedupe
          return {
            draft: {
              ...s.draft,
              selected: [...s.draft.selected, it],
              meta: { updatedAt: Date.now() },
            },
          };
        }),
      removeItem: (code) =>
        set((s) => ({
          draft: {
            ...s.draft,
            selected: s.draft.selected.filter((x) => x.code !== code),
            meta: { updatedAt: Date.now() },
          },
        })),
      setQuickRules: (rs) =>
        set((s) => ({
          draft: {
            ...s.draft,
            quickRules: rs,
            meta: { updatedAt: Date.now() },
          },
        })),
      clear: () => set({ draft: initial }),
    }),
    { name: "mbspro-claim-draft" } // localStorage key
  )
);
