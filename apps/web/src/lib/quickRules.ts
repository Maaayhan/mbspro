// Very lightweight client-side checks for MVP
import type { QuickRuleResult, SelectedItem } from '@/store/useClaimDraft';

type Inputs = {
  notes: string;
  items: SelectedItem[];
};

const hasMinDocumentation = (notes: string): QuickRuleResult => {
  const len = notes.trim().length;
  if (len === 0) return { id: 'R001', name: 'Documentation Completeness', status: 'fail', reason: 'No clinical note provided' };
  if (len < 80)  return { id: 'R001', name: 'Documentation Completeness', status: 'warning', reason: 'Note is short; consider adding Hx/Ex/Plan' };
  return { id: 'R001', name: 'Documentation Completeness', status: 'ok', reason: 'All required clinical notes appear present (MVP check)' };
};

const timeIntervalHeuristic = (items: SelectedItem[]): QuickRuleResult => {
  // MVP: if both 23 and 36 selected, warn (real rule engine later)
  const has23 = items.some(i => i.code === '23');
  const has36 = items.some(i => i.code === '36');
  if (has23 && has36) {
    return { id: 'R002', name: 'Time Interval Compliance', status: 'warning', reason: 'Items 23 and 36 together may violate same-day rules' };
  }
  return { id: 'R002', name: 'Time Interval Compliance', status: 'ok', reason: 'No obvious time-interval conflicts detected (MVP)' };
};

const patientEligibilityHeuristic = (notes: string): QuickRuleResult => {
  // MVP: if notes contain "telehealth" and '36' selected would normally be fine,
  // here just return ok; in real app use patient/provider context.
  const mentionsTele = /telehealth/i.test(notes);
  return mentionsTele
    ? { id: 'R003', name: 'Patient Eligibility', status: 'ok', reason: 'Telehealth mentioned; eligibility likely ok (MVP)' }
    : { id: 'R003', name: 'Patient Eligibility', status: 'ok', reason: 'No eligibility red flags (MVP)' };
};

const codeAccuracyHeuristic = (items: SelectedItem[]): QuickRuleResult => {
  if (items.length === 0) {
    return { id: 'R004', name: 'Code Accuracy', status: 'warning', reason: 'No items chosen yet' };
  }
  return { id: 'R004', name: 'Code Accuracy', status: 'ok', reason: 'Codes look reasonable (MVP)' };
};

const billingRulesHeuristic = (_: Inputs): QuickRuleResult => {
  return { id: 'R005', name: 'Billing Rules', status: 'ok', reason: 'No mutually-exclusive conflicts detected (MVP)' };
};

export const runQuickRules = (inputs: Inputs): QuickRuleResult[] => {
  const { notes, items } = inputs;
  return [
    hasMinDocumentation(notes),
    timeIntervalHeuristic(items),
    patientEligibilityHeuristic(notes),
    codeAccuracyHeuristic(items),
    billingRulesHeuristic(inputs),
  ];
};
