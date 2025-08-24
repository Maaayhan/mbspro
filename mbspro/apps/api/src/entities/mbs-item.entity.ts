import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';

@Entity('mbs_items')
export class MbsItem {
  @ApiProperty({ description: 'MBS item code (Primary Key)', example: '23' })
  @PrimaryColumn({ type: 'varchar', length: 50 })
  code: string;

  @ApiProperty({ description: 'Item title', example: 'Professional attendance by a general practitioner' })
  @Column({ type: 'varchar', length: 500 })
  title: string;

  @ApiProperty({ description: 'Item description', example: 'Professional attendance by a general practitioner at consulting rooms' })
  @Column({ type: 'text', name: 'desc' })
  desc: string;

  @ApiProperty({ description: 'Fee amount', example: 41.20 })
  @Column({ type: 'decimal', precision: 10, scale: 2 })
  fee: number;

  @ApiProperty({ description: 'Time threshold in minutes', example: 20, required: false })
  @Column({ type: 'integer', nullable: true, name: 'time_threshold' })
  timeThreshold?: number;

  @ApiProperty({ 
    description: 'Flags for special conditions',
    example: { telehealth: true, after_hours: false },
    type: 'object'
  })
  @Column({ type: 'jsonb' })
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
  @Column({ type: 'text', array: true, default: '{}', name: 'mutually_exclusive_with' })
  mutuallyExclusiveWith: string[];

  @ApiProperty({ 
    description: 'Reference materials',
    example: ['MBS Guidelines 2023', 'Clinical Notes'],
    type: [String]
  })
  @Column({ type: 'text', array: true, default: '{}' })
  references: string[];

  @ApiProperty({ description: 'Creation timestamp' })
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ApiProperty({ description: 'Last update timestamp' })
  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
