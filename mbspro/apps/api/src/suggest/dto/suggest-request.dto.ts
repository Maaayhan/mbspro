import { IsString, IsOptional, IsNumber, Min } from 'class-validator';
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
}
