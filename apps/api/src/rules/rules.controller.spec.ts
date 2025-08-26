import { Test, TestingModule } from "@nestjs/testing";
import { RulesService } from "./rules.service";
import { RuleCandidateDto } from "./dto/evaluate-rule.dto";

describe("RulesService", () => {
  let service: RulesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [RulesService],
    }).compile();

    service = module.get<RulesService>(RulesService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  it("should fail when duration below threshold", () => {
    const candidates: RuleCandidateDto[] = [
      {
        code: "23",
        title: "Standard GP consult",
        fee: 41.2,
        timeThreshold: 20,
        flags: { telehealth: false, after_hours: false },
        mutuallyExclusiveWith: ["36"],
        selected: true,
        context: "in_person",
        durationMinutes: 15,
      },
    ];

    const result = service.evaluateCandidates(candidates);
    expect(result[0].status).toBe("FAIL");
    expect(result[0].short_explain).toContain(
      "Duration below required threshold"
    );
  });

  it("should warn when unselected but conflicts exist", () => {
    const candidates: RuleCandidateDto[] = [
      {
        code: "23",
        title: "Standard GP consult",
        fee: 41.2,
        timeThreshold: 20,
        flags: { telehealth: false, after_hours: false },
        mutuallyExclusiveWith: ["36"],
        selected: false,
        context: "in_person",
        durationMinutes: 25,
      },
      {
        code: "36",
        title: "Prolonged GP consult",
        fee: 71.7,
        timeThreshold: 40,
        flags: { telehealth: false, after_hours: false },
        mutuallyExclusiveWith: ["23"],
        selected: true,
        context: "in_person",
        durationMinutes: 45,
      },
    ];

    const result = service.evaluateCandidates(candidates);
    const code23 = result.find((r) => r.code === "23");
    expect(code23.status).toBe("WARN");
    expect(code23.short_explain).toContain("Mutually exclusive");
  });

  it("should pass when all rules satisfied", () => {
    const candidates: RuleCandidateDto[] = [
      {
        code: "36",
        title: "Prolonged GP consult",
        fee: 71.7,
        timeThreshold: 40,
        flags: { telehealth: false },
        mutuallyExclusiveWith: ["23"],
        selected: true,
        context: "in_person",
        durationMinutes: 45,
      },
    ];

    const result = service.evaluateCandidates(candidates);
    expect(result[0].status).toBe("PASS");
    expect(result[0].short_explain).toBe("All rules passed");
  });
});
