import { IsString, IsOptional, IsNumber, Min, IsArray, IsBoolean, IsIn, IsISO8601 } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import type { SuggestRequest } from '@mbspro/shared';

export class SuggestRequestDto implements SuggestRequest {
  @ApiProperty({
    description: 'The clinical note or text to analyze for MBS item suggestions',
    example: 'Patient consultation for chronic pain management with review of medications'
  })
  @IsString()
  note: string;

  @ApiProperty({
    description: 'Maximum number of suggestions to return',
    example: 5,
    required: false,
    minimum: 1
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  topN?: number;

  @ApiProperty({ required: false, type: [String], description: 'Codes already selected in this encounter' })
  @IsOptional()
  @IsArray()
  selectedCodes?: string[];

  @ApiProperty({ required: false, description: 'Last claimed items history for this patient' })
  @IsOptional()
  lastClaimedItems?: Array<{ code: string; at: string }>;

  @ApiProperty({ required: false, enum: ['GP', 'Registrar', 'NP', 'Specialist'] })
  @IsOptional()
  @IsIn(['GP', 'Registrar', 'NP', 'Specialist'])
  providerType?: 'GP' | 'Registrar' | 'NP' | 'Specialist';

  @ApiProperty({ required: false, enum: ['clinic', 'home', 'nursing_home', 'hospital'] })
  @IsOptional()
  @IsIn(['clinic', 'home', 'nursing_home', 'hospital'])
  location?: 'clinic' | 'home' | 'nursing_home' | 'hospital';

  @ApiProperty({ required: false, description: 'Whether a referral document is present/valid' })
  @IsOptional()
  @IsBoolean()
  referralPresent?: boolean;

  @ApiProperty({ required: false, description: 'Consultation start time (ISO 8601)' })
  @IsOptional()
  @IsISO8601()
  consultStart?: string;

  @ApiProperty({ required: false, description: 'Consultation end time (ISO 8601)' })
  @IsOptional()
  @IsISO8601()
  consultEnd?: string;

  @ApiProperty({ required: false, enum: ['business', 'after_hours', 'public_holiday'] })
  @IsOptional()
  @IsIn(['business', 'after_hours', 'public_holiday'])
  hoursBucket?: 'business' | 'after_hours' | 'public_holiday';
}
