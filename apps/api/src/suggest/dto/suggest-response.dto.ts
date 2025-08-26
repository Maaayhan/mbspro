import { ApiProperty } from '@nestjs/swagger';
import type { SuggestResponse, SuggestCandidate, Signals, RuleResult } from '@mbspro/shared';

export class SuggestCandidateDto implements SuggestCandidate {
  @ApiProperty({ description: 'MBS item code', example: '23' })
  code: string;

  @ApiProperty({ description: 'MBS item title', example: 'Professional attendance by a general practitioner' })
  title: string;

  @ApiProperty({ description: 'Relevance score', example: 0.95 })
  score: number;

  @ApiProperty({ 
    description: 'Detailed score breakdown',
    example: { relevance: 0.9, confidence: 0.95, context: 0.8 },
    required: false
  })
  score_breakdown?: Record<string, number>;

  @ApiProperty({ 
    description: 'Features that matched in the analysis',
    example: ['consultation', 'general practitioner'],
    type: [String],
    required: false
  })
  feature_hits?: string[];

  @ApiProperty({ 
    description: 'Brief explanation of why this item was suggested',
    example: 'Matches consultation pattern with GP attendance',
    required: false
  })
  short_explain?: string;

  @ApiProperty({
    description: 'Rule evaluation results for this candidate',
    required: false,
    type: 'array',
  })
  rule_results?: RuleResult[];

  @ApiProperty({
    description: 'Compliance level derived from rules',
    example: 'green',
    required: false,
  })
  compliance?: 'green' | 'amber' | 'red';
}

export class SignalsDto implements Signals {
  @ApiProperty({ description: 'Processing duration in milliseconds', example: 150 })
  duration: number;

  @ApiProperty({ description: 'Processing mode used', example: 'fast' })
  mode: string;

  @ApiProperty({ description: 'Whether request was processed after hours', example: false })
  after_hours: boolean;

  @ApiProperty({ description: 'Whether this represents a chronic condition pattern', example: true })
  chronic: boolean;
}

export class SuggestResponseDto implements SuggestResponse {
  @ApiProperty({ 
    description: 'Array of suggested MBS items',
    type: [SuggestCandidateDto]
  })
  candidates: SuggestCandidateDto[];

  @ApiProperty({ 
    description: 'Processing signals and metadata',
    type: SignalsDto,
    required: false
  })
  signals?: SignalsDto;
}
