import {
  IsBoolean,
  IsOptional,
  IsString,
  IsNumber,
  ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";

export class RuleCandidateDto {
  @IsString() code: string;
  @IsString() title: string;
  @IsNumber() fee: number;

  @IsOptional()
  @IsNumber()
  timeThreshold?: number;

  @IsOptional()
  flags?: Record<string, boolean>;

  @IsOptional()
  mutuallyExclusiveWith?: string[];

  @IsBoolean()
  selected: boolean;

  @IsOptional()
  @IsString()
  context?: "telehealth" | "in_person";

  @IsOptional()
  @IsNumber()
  durationMinutes?: number;
}

export class EvaluateRuleDto {
  @ValidateNested({ each: true })
  @Type(() => RuleCandidateDto)
  candidates: RuleCandidateDto[];
}
