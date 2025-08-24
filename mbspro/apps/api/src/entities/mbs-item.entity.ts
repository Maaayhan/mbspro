import { ApiProperty } from '@nestjs/swagger';

export interface MbsItem {
  @ApiProperty({ description: 'MBS item code (Primary Key)', example: '23' })
  code: string;

  @ApiProperty({ description: 'Item title', example: 'Professional attendance by a general practitioner' })
  title: string;

  @ApiProperty({ description: 'Item description', example: 'Professional attendance by a general practitioner at consulting rooms' })
  description: string;

  @ApiProperty({ description: 'Fee amount', example: 41.20 })
  fee: number;

  @ApiProperty({ description: 'Time threshold in minutes', example: 20, required: false })
  timeThreshold?: number;

  @ApiProperty({ 
    description: 'Flags for special conditions',
    example: { telehealth: true, after_hours: false },
    type: 'object'
  })
  flags: {
    telehealth?: boolean;
    after_hours?: boolean;
    [key: string]: any;
  };

  @ApiProperty({ 
    description: 'Mutually exclusive item codes',
    example: ['24', '25'],
    type: [String]
  })
  mutuallyExclusiveWith: string[];

  @ApiProperty({ 
    description: 'Reference materials',
    example: ['MBS Guidelines 2023', 'Clinical Notes'],
    type: [String]
  })
  references: string[];

  @ApiProperty({ description: 'Creation timestamp' })
  createdAt: Date;

  @ApiProperty({ description: 'Last update timestamp' })
  updatedAt: Date;
}

export interface MbsItemRow {
  code: string;
  title: string;
  description: string;
  fee: number;
  time_threshold?: number;
  flags: {
    telehealth?: boolean;
    after_hours?: boolean;
    [key: string]: any;
  };
  mutually_exclusive_with: string[];
  reference_docs: string[];
  created_at: Date;
  updated_at: Date;
}
