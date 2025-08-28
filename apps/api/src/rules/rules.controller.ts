import { Body, Controller, Post } from "@nestjs/common";
import { RulesService } from "./rules.service";
import { EvaluateRuleDto } from "./dto/evaluate-rule.dto";
import { SuggestCandidate } from "../shared";
import { ValidateSelectionDto } from './dto/validate-selection.dto';

@Controller("rules")
export class RulesController {
  constructor(private readonly rulesService: RulesService) {}

  @Post("evaluate")
  async evaluateRules(
    @Body() dto: EvaluateRuleDto
  ): Promise<SuggestCandidate[]> {
    return this.rulesService.evaluateCandidates(dto.candidates);
  }

  @Post('validate-selection')
  async validateSelection(@Body() dto: ValidateSelectionDto) {
    return this.rulesService.validateSelection(dto);
  }
}
