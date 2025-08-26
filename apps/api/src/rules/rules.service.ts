import { Injectable } from "@nestjs/common";
import { RuleCandidateDto } from "./dto/evaluate-rule.dto";
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
}
