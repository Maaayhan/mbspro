import { IsString, IsOptional, IsUUID, IsArray, IsIn, ValidateNested, IsObject } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class SelectedItemDto {
  @ApiProperty({
    description: 'MBS item code',
    example: '23'
  })
  @IsString()
  code: string;

  @ApiProperty({
    description: 'MBS item title',
    example: 'Professional attendance by a general practitioner'
  })
  @IsString()
  title: string;

  @ApiProperty({
    description: 'MBS item fee',
    example: '$41.20',
    required: false
  })
  @IsOptional()
  @IsString()
  fee?: string;

  @ApiProperty({
    description: 'MBS item description',
    required: false
  })
  @IsOptional()
  @IsString()
  description?: string;
}

export class GenerateDocRequestDto {
  @ApiProperty({
    description: 'Type of document to generate',
    enum: ['referral', 'care_plan'],
    example: 'referral'
  })
  @IsString()
  @IsIn(['referral', 'care_plan'])
  docType: 'referral' | 'care_plan';

  @ApiProperty({
    description: 'Patient UUID from Supabase',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  @IsUUID()
  patientId: string;

  @ApiProperty({
    description: 'Practitioner UUID from Supabase',
    example: '123e4567-e89b-12d3-a456-426614174001'
  })
  @IsUUID()
  practitionerId: string;

  @ApiProperty({
    description: 'Clinical notes from the consultation',
    example: 'Patient presented with chest pain. Physical examination normal. Recommend chest X-ray for further investigation.'
  })
  @IsString()
  clinicalNotes: string;

  @ApiProperty({
    description: 'Array of selected MBS items',
    type: [SelectedItemDto]
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SelectedItemDto)
  selectedItems: SelectedItemDto[];

  @ApiProperty({
    description: 'Additional context and options for document generation',
    required: false,
    example: { urgency: 'routine', specialInstructions: 'Patient prefers morning appointments' }
  })
  @IsOptional()
  @IsObject()
  extras?: Record<string, any>;
}
