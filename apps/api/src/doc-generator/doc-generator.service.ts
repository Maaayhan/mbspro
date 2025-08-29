import { Injectable, Logger, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { SupabaseService } from '../services/supabase.service';
import { GenerateDocRequestDto } from './dto/generate-doc-request.dto';
import { GenerateDocResponseDto } from './dto/generate-doc-response.dto';

@Injectable()
export class DocGeneratorService {
  private readonly logger = new Logger(DocGeneratorService.name);

  constructor(private readonly supabaseService: SupabaseService) {}

  async generateDocument(request: GenerateDocRequestDto): Promise<GenerateDocResponseDto> {
    try {
      // 1. Fetch patient and practitioner data from Supabase using service role
      const [patientData, practitionerData] = await Promise.all([
        this.fetchPatientData(request.patientId),
        this.fetchPractitionerData(request.practitionerId)
      ]);

      // 2. Validate data
      if (!patientData) {
        throw new BadRequestException(`Patient not found: ${request.patientId}`);
      }
      if (!practitionerData) {
        throw new BadRequestException(`Practitioner not found: ${request.practitionerId}`);
      }

      // 3. Generate document using OpenAI
      const generatedDoc = await this.callOpenAI(request, patientData, practitionerData);

      return generatedDoc;
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error('Error generating document:', error);
      throw new InternalServerErrorException('Failed to generate document');
    }
  }

  private async fetchPatientData(patientId: string): Promise<any> {
    try {
      const { data, error } = await this.supabaseService.getClient()
        .from('mbs_patients')
        .select(`
          id,
          full_name,
          gender,
          dob,
          medicare_number,
          phone,
          address,
          fhir,
          managing_org_id,
          gp_id,
          mbs_organizations!managing_org_id (
            name,
            hpio,
            phone,
            address
          )
        `)
        .eq('id', patientId)
        .single();

      if (error) {
        this.logger.error('Error fetching patient data:', error);
        throw error;
      }

      return data;
    } catch (error) {
      this.logger.error(`Failed to fetch patient ${patientId}:`, error);
      return null;
    }
  }

  private async fetchPractitionerData(practitionerId: string): Promise<any> {
    try {
      const { data, error } = await this.supabaseService.getClient()
        .from('mbs_practitioners')
        .select(`
          id,
          full_name,
          specialty,
          hpii,
          provider_number,
          phone,
          fhir,
          organization_id,
          mbs_organizations!organization_id (
            name,
            hpio,
            phone,
            address
          )
        `)
        .eq('id', practitionerId)
        .single();

      if (error) {
        this.logger.error('Error fetching practitioner data:', error);
        throw error;
      }

      return data;
    } catch (error) {
      this.logger.error(`Failed to fetch practitioner ${practitionerId}:`, error);
      return null;
    }
  }

  private async callOpenAI(
    request: GenerateDocRequestDto,
    patientData: any,
    practitionerData: any
  ): Promise<GenerateDocResponseDto> {
    if (!process.env.OPENAI_API_KEY) {
      throw new InternalServerErrorException('OpenAI API key not configured');
    }

    try {
      const prompt = this.buildPrompt(request, patientData, practitionerData);
      const schema = this.getResponseSchema(request.docType);

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: process.env.OPENAI_CHAT_MODEL || 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: 'You are a medical documentation assistant for Australian healthcare. Follow RACGP and Services Australia standards. Use Australian English spelling and professional clinical style. Never invent data—if missing, write "Not provided".'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          response_format: {
            type: 'json_schema',
            json_schema: {
              name: 'medical_document',
              schema: schema
            }
          },
          temperature: 0.3,
          max_tokens: 2000
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        this.logger.error('OpenAI API error:', errorText);
        throw new InternalServerErrorException('Failed to generate document with OpenAI');
      }

      const result = await response.json();
      const content = result.choices?.[0]?.message?.content;

      if (!content) {
        throw new InternalServerErrorException('Empty response from OpenAI');
      }

      return JSON.parse(content);
    } catch (error) {
      this.logger.error('OpenAI API call failed:', error);
      throw new InternalServerErrorException('Failed to generate document');
    }
  }

  private buildPrompt(
    request: GenerateDocRequestDto,
    patientData: any,
    practitionerData: any
  ): string {
    const formatDate = (dateStr: string) => {
      if (!dateStr) return 'Not provided';
      try {
        return new Date(dateStr).toLocaleDateString('en-AU');
      } catch {
        return dateStr;
      }
    };

    const organizationName = practitionerData.mbs_organizations?.name || 'Not provided';
    const organizationAddress = practitionerData.mbs_organizations?.address || 'Not provided';
    
    const patientName = patientData.full_name || 'Not provided';
    const patientDob = formatDate(patientData.dob);
    const gender = patientData.gender || 'Not provided';
    const medicareNumber = patientData.medicare_number || 'Not provided';
    const phone = patientData.phone || 'Not provided';
    const address = patientData.address || 'Not provided';
    
    const practitionerName = practitionerData.full_name || 'Not provided';
    const specialty = practitionerData.specialty || 'General Practice';
    const hpii = practitionerData.hpii || 'Not provided';
    const provider_number = practitionerData.provider_number || 'Not provided';
    
    const mbsItems = request.selectedItems.map(item => 
      `- ${item.code}: ${item.title}${item.fee ? ` (${item.fee})` : ''}${item.description ? ` - ${item.description}` : ''}`
    ).join('\n');
    
    const extras = request.extras ? JSON.stringify(request.extras, null, 2) : 'None provided';

    if (request.docType === 'referral') {
      return this.buildReferralPrompt(
        patientName, patientDob, gender, medicareNumber, phone, address,
        practitionerName, specialty, organizationName, organizationAddress, hpii, provider_number,
        request.clinicalNotes, mbsItems, extras
      );
    } else {
      return this.buildCarePlanPrompt(
        patientName, patientDob, gender, medicareNumber, phone, address,
        practitionerName, specialty, organizationName, organizationAddress, hpii, provider_number,
        request.clinicalNotes, mbsItems, extras
      );
    }
  }

  private buildReferralPrompt(
    patientName: string, patientDob: string, gender: string, medicareNumber: string, 
    phone: string, address: string, practitionerName: string, specialty: string,
    organisation: string, organisationAddress: string, hpii: string, provider_number: string,
    clinicalNotes: string, mbsItems: string, extras: string
  ): string {
    return `Generate a professional Australian medical referral letter.

## Patient
- Name: ${patientName}
- DOB: ${patientDob}
- Gender: ${gender}
- Medicare: ${medicareNumber}
- Phone: ${phone}
- Address: ${address}

## Referring Practitioner
- Name: ${practitionerName}
- Specialty: ${specialty}
- Organisation: ${organisation}
- Address: ${organisationAddress}
- Provider No: ${provider_number}
- HPII: ${hpii}

## Clinical Notes
${clinicalNotes || 'Not provided'}

## Selected MBS Items
${mbsItems || 'Not provided'}

## Extras
${extras}

## Requirements
- Clear referral reason and request ("assess and advise").
- State referral validity (default 12 months).
- Note any attached investigations (ECG, CXR etc).
- Include patient identifiers (name, DOB, Medicare, contact, address).
- Include practitioner identifiers (name, specialty, organisation, Provider No, HPII).
- Format output as JSON: { "title": "...", "meta": {...}, "body_markdown": "...", "summary": "..." }.`;
  }

  private buildCarePlanPrompt(
    patientName: string, patientDob: string, gender: string, medicareNumber: string,
    phone: string, address: string, practitionerName: string, specialty: string,
    organisation: string, organisationAddress: string, hpii: string, provider_number: string,
    clinicalNotes: string, mbsItems: string, extras: string
  ): string {
    return `Generate a professional Australian GP Management Plan (Care Plan).

## Patient
- Name: ${patientName}
- DOB: ${patientDob}
- Gender: ${gender}
- Medicare: ${medicareNumber}
- Phone: ${phone}
- Address: ${address}

## GP / Practitioner
- Name: ${practitionerName}
- Specialty: ${specialty}
- Organisation: ${organisation}
- Address: ${organisationAddress}
- Provider No: ${provider_number}
- HPII: ${hpii}

## Clinical Notes
${clinicalNotes || 'Not provided'}

## Selected MBS Items
${mbsItems || 'Not provided'}

## Extras
${extras}

## Requirements
- Summarise the patient's key health conditions/problems.
- Define 1–3 SMART goals for care.
- Outline planned interventions: actions for GP, patient, and allied health (if relevant).
- List care team members and their roles (GP, NP, allied health).
- Add a patient consent statement.
- Set a review date (within 3–6 months).
- Reference correct MBS items (721 for GPMP; 723 for TCA if team care involved).
- Format strictly as JSON: { "title": "...", "meta": {...}, "body_markdown": "...", "summary": "..." }.`;
  }

  private getResponseSchema(docType: string) {
    return {
      type: 'object',
      properties: {
        title: {
          type: 'string',
          description: `Professional title for the ${docType}`
        },
        meta: {
          type: 'object',
          description: 'Document metadata',
          properties: {
            type: { type: 'string' },
            date: { type: 'string' },
            practitioner: { type: 'string' },
            patient: { type: 'string' },
            specialty: { type: 'string' }
          }
        },
        body_markdown: {
          type: 'string',
          description: 'Full document body in Markdown format'
        },
        summary: {
          type: 'string',
          description: 'Brief summary of the document'
        }
      },
      required: ['title', 'meta', 'body_markdown'],
      additionalProperties: false
    };
  }
}
