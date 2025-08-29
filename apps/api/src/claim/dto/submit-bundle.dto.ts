import {
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
  IsArray,
} from "class-validator";
import { Type } from "class-transformer";
import { SelectedItemDto, ClaimMetaDto } from "./build-claim.dto";

export class EncounterInputDto {
  @IsIn(["in_person", "telehealth", "after_hours"])
  visitType!: "in_person" | "telehealth" | "after_hours";

  @IsOptional() @IsString() start?: string;
  @IsOptional() @IsString() end?: string;
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  durationMinutes?: number;

  @IsOptional() @IsString() locationDisplay?: string;
}

export class SubmitBundleDto {
  @IsOptional()
  @IsString()
  patientId?: string;

  @IsString()
  practitionerId!: string;

  @ValidateNested()
  @Type(() => EncounterInputDto)
  encounter!: EncounterInputDto;

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
