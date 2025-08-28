import {
  IsArray,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";

export class SelectedItemDto {
  @IsString() code!: string;

  @IsOptional() @IsString() display?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  modifiers?: string[];

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  unitPrice?: number;
}

export class ClaimMetaDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  durationMinutes?: number;

  @IsOptional()
  @IsIn(["in_person", "telehealth", "after_hours"])
  visitType?: "in_person" | "telehealth" | "after_hours";

  @IsOptional()
  @IsString()
  rawNote?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  ruleNotes?: string[];
}

export class BuildClaimDto {
  @IsString() patientId!: string;
  @IsString() practitionerId!: string;
  @IsString() encounterId!: string;

  @ValidateNested({ each: true })
  @Type(() => SelectedItemDto)
  @IsArray()
  selected!: SelectedItemDto[];

  @IsOptional()
  @Type(() => ClaimMetaDto)
  meta?: ClaimMetaDto;

  @IsOptional()
  @IsString()
  currency?: "AUD";
}
