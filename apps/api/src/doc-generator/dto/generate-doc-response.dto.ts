import { ApiProperty } from '@nestjs/swagger';

export class GenerateDocResponseDto {
  @ApiProperty({
    description: 'Document title',
    example: 'Referral to Cardiology - John Smith'
  })
  title: string;

  @ApiProperty({
    description: 'Document metadata including date, type, etc.',
    example: {
      type: 'referral',
      date: '2024-01-15',
      practitioner: 'Dr Emily Johnson',
      patient: 'John Smith',
      specialty: 'Cardiology'
    }
  })
  meta: Record<string, any>;

  @ApiProperty({
    description: 'Document body in Markdown format',
    example: `# Referral to Cardiology

## Patient Information
- **Name**: John Smith
- **DOB**: 15/03/1978
- **Medicare**: 2123456781

## Clinical Summary
Patient presented with chest pain. Physical examination was normal. 

## Request
Please assess for cardiac cause of chest pain.

## Investigations
- Chest X-ray (MBS 58503): Normal

**Dr Emily Johnson**  
*General Practitioner*  
Melbourne Medical Centre`
  })
  body_markdown: string;

  @ApiProperty({
    description: 'Document summary for quick reference',
    required: false,
    example: 'Routine referral to cardiology for chest pain assessment. No urgent indicators present.'
  })
  summary?: string;
}
