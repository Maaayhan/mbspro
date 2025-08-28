import { IsArray, IsBoolean, IsISO8601, IsIn, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class LastClaimedItemDto {
  @IsString()
  code: string;

  @IsString()
  at: string; // ISO
}

export class ValidateSelectionDto {
  @IsArray()
  @IsString({ each: true })
  selectedCodes: string[];

  @IsOptional()
  @IsString()
  note?: string;

  @IsOptional()
  @IsIn(['in-person', 'telehealth', 'video', 'phone'])
  mode?: string;

  @IsOptional()
  @IsIn(['business', 'after_hours', 'public_holiday'])
  hoursBucket?: string;

  @IsOptional()
  @IsIn(['clinic', 'home', 'nursing_home', 'hospital'])
  location?: string;

  @IsOptional()
  @IsIn(['GP', 'Registrar', 'NP', 'Specialist'])
  providerType?: string;

  @IsOptional()
  @IsBoolean()
  referralPresent?: boolean;

  @IsOptional()
  @IsISO8601()
  consultStart?: string;

  @IsOptional()
  @IsISO8601()
  consultEnd?: string;

  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => LastClaimedItemDto)
  lastClaimedItems?: LastClaimedItemDto[];
}


