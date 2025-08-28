import { Injectable } from "@nestjs/common";
import { RuleCandidateDto } from "./dto/evaluate-rule.dto";
import { ValidateSelectionDto } from './dto/validate-selection.dto';
import * as fs from 'fs';
import * as path from 'path';
import { SuggestCandidate } from "../shared/index";

/// Simple rule evaluation service
/// test by pnpm --filter @mbspro/api exec -- jest --testPathPattern=rules --runInBand
@Injectable()
export class RulesService {
  evaluateCandidates(candidates: RuleCandidateDto[]): SuggestCandidate[] {
    const selectedCodes = candidates
      .filter((c) => c.selected)
      .map((c) => c.code);

    return candidates.map((candidate) => {
      const reasons: string[] = [];

      const conflicts =
        candidate.mutuallyExclusiveWith?.filter((c) =>
          selectedCodes.includes(c)
        ) || [];
      if (conflicts.length > 0) {
        reasons.push(
          `Mutually exclusive with selected codes: ${conflicts.join(", ")}`
        );
      }

      // Check time threshold
      if (
        candidate.selected &&
        candidate.timeThreshold &&
        candidate.durationMinutes !== undefined
      ) {
        if (candidate.durationMinutes < candidate.timeThreshold) {
          reasons.push(
            `Duration below required threshold of ${candidate.timeThreshold} minutes`
          );
        }
      }

      // Check telehealth flag mismatch
      if (
        candidate.selected &&
        candidate.flags?.telehealth !== undefined &&
        candidate.context
      ) {
        if (
          (candidate.flags.telehealth && candidate.context !== "telehealth") ||
          (!candidate.flags.telehealth && candidate.context === "telehealth")
        ) {
          reasons.push(`Context mismatch: telehealth flag vs selected context`);
        }
      }

      // Determine status
      let status: "PASS" | "WARN" | "FAIL" = "PASS";
      if (reasons.length > 0) {
        status = candidate.selected ? "FAIL" : "WARN";
      }

      return {
        code: candidate.code,
        title: candidate.title,
        score: 0, // optional, can be reused later
        short_explain: reasons.join("; ") || "All rules passed",
        status,
      };
    });
  }

  validateSelection(dto: ValidateSelectionDto) {
    // Load normalized rules to inspect mutual exclusivity and flags
    const rulesPath = process.env.MBS_RULES_JSON || path.resolve(__dirname, '..', 'suggest', 'mbs_rules.normalized.json');
    let byCode = new Map<string, any>();
    try {
      const rawPath = fs.existsSync(rulesPath) ? rulesPath : path.resolve(process.cwd(), 'apps', 'api', 'src', 'suggest', 'mbs_rules.normalized.json');
      const raw = fs.readFileSync(rawPath, 'utf8');
      const arr = JSON.parse(raw);
      if (Array.isArray(arr)) {
        byCode = new Map(arr.map((x: any) => [String(x.code), x]));
      }
    } catch {}

    const selected = new Set<string>((dto.selectedCodes || []).map(String));
    const conflicts: Array<{ code: string; with: string[] }> = [];
    for (const code of selected) {
      const item = byCode.get(code);
      const ex = Array.isArray(item?.mutuallyExclusiveWith) ? item.mutuallyExclusiveWith.map(String) : [];
      const overlap = ex.filter((c: string) => selected.has(c));
      if (overlap.length > 0) conflicts.push({ code, with: overlap });
    }

    // Simple blocked rule: if any conflict, mark blocked
    const blocked = conflicts.length > 0;
    const warnings: string[] = conflicts.map((c) => `${c.code} ↔ ${c.with.join(', ')}`);

    return {
      ok: true,
      blocked,
      conflicts,
      warnings,
    };
  }
}
