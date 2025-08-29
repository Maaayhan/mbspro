import * as fs from 'fs';
import * as path from 'path';
import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../services/supabase.service';
import type { KBItem, RuleEntry } from './types';

export interface KBRulesBundle {
  kb: KBItem[];
  rules: RuleEntry[];
  versions: { kb: string; rules: string };
}

@Injectable()
export class KBRulesLoader {
  private kbPath: string;
  private rulesPath: string;
  private bundle: KBRulesBundle = { kb: [], rules: [], versions: { kb: 'unknown', rules: 'unknown' } };

  constructor(private readonly supa?: SupabaseService) {
    const candidates = [
      path.resolve(process.cwd(), 'apps', 'api', 'data', 'mbs'), // monorepo root
      path.resolve(process.cwd(), 'data', 'mbs'),                 // running from apps/api
      path.resolve(__dirname, '..', '..', 'data', 'mbs'),         // compiled dist context
    ];
    const root = candidates.find((p) => fs.existsSync(p)) || candidates[0];
    this.kbPath = process.env.MBS_KB_FILE || path.join(root, 'kb.json');
    this.rulesPath = process.env.MBS_RULES_FILE || path.join(root, 'rules.json');
    this.reload();
  }

  reload(): void {
    this.bundle = { kb: [], rules: [], versions: { kb: 'unknown', rules: 'unknown' } };
    try {
      if (fs.existsSync(this.kbPath)) {
        const raw = fs.readFileSync(this.kbPath, 'utf8');
        const parsed = JSON.parse(raw);
        this.bundle.kb = Array.isArray(parsed.items) ? parsed.items : Array.isArray(parsed) ? parsed : [];
        this.bundle.versions.kb = String(parsed.version || 'kb-1');
      }
    } catch {}
    try {
      if (fs.existsSync(this.rulesPath)) {
        const raw = fs.readFileSync(this.rulesPath, 'utf8');
        const parsed = JSON.parse(raw);
        this.bundle.rules = Array.isArray(parsed.rules) ? parsed.rules : Array.isArray(parsed) ? parsed : [];
        this.bundle.versions.rules = String(parsed.version || 'rules-1');
      }
    } catch {}
  }

  getBundle(): KBRulesBundle { return this.bundle; }
  getVersions(): { kb: string; rules: string } { return this.bundle.versions; }

  async seedClaims() {
    if (!this.supa) {
      return { error: 'Supabase service not available' };
    }

    try {
      // Check if we already have claims data
      const { data: existingClaims } = await this.supa.getClient()
        .from('claims')
        .select('id')
        .limit(1);

      if (existingClaims && existingClaims.length > 0) {
        return { message: 'Claims data already exists', count: 0 };
      }

      // Get practitioner and patient IDs
      const { data: practitioners } = await this.supa.getClient()
        .from('mbs_practitioners')
        .select('id, provider_number, full_name');

      const { data: patients } = await this.supa.getClient()
        .from('mbs_patients')
        .select('id, full_name');

      if (!practitioners || !patients || practitioners.length === 0 || patients.length === 0) {
        return { error: 'No practitioners or patients found. Please ensure base data is seeded first.' };
      }

      // Create sample claims
      const now = new Date();
      const sampleClaims = [
        {
          patient_id: patients.find(p => p.full_name.includes('Olivia'))?.id,
          practitioner_id: practitioners.find(p => p.provider_number === '456789A')?.id,
          encounter_id: 'ENC-2024-001',
          items: [{"code": "23", "description": "Professional attendance by a general practitioner", "quantity": 1, "unitPrice": 41.20}],
          total_amount: 41.20,
          currency: 'AUD',
          notes: 'Regular consultation',
          submission_status: 'success',
          status: 'paid',
          created_at: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString()
        },
        {
          patient_id: patients.find(p => p.full_name.includes('Olivia'))?.id,
          practitioner_id: practitioners.find(p => p.provider_number === '456789A')?.id,
          encounter_id: 'ENC-2024-002',
          items: [{"code": "36", "description": "Consultation Level C", "quantity": 1, "unitPrice": 82.40}],
          total_amount: 82.40,
          currency: 'AUD',
          notes: 'Complex consultation',
          submission_status: 'success',
          status: 'paid',
          created_at: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000).toISOString()
        },
        {
          patient_id: patients.find(p => p.full_name.includes('Olivia'))?.id,
          practitioner_id: practitioners.find(p => p.provider_number === '456789A')?.id,
          encounter_id: 'ENC-2024-003',
          items: [{"code": "721", "description": "Health Assessment", "quantity": 1, "unitPrice": 67.00}],
          total_amount: 67.00,
          currency: 'AUD',
          notes: 'Annual health assessment',
          submission_status: 'failed',
          submission_error_reason: 'Insufficient documentation',
          status: 'rejected',
          created_at: new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000).toISOString()
        },
        {
          patient_id: patients.find(p => p.full_name.includes('William'))?.id,
          practitioner_id: practitioners.find(p => p.provider_number === '456790B')?.id,
          encounter_id: 'ENC-2024-004',
          items: [{"code": "11700", "description": "ECG", "quantity": 1, "unitPrice": 26.55}],
          total_amount: 26.55,
          currency: 'AUD',
          notes: 'ECG examination',
          submission_status: 'success',
          status: 'paid',
          created_at: new Date(now.getTime() - 8 * 24 * 60 * 60 * 1000).toISOString()
        },
        {
          patient_id: patients.find(p => p.full_name.includes('William'))?.id,
          practitioner_id: practitioners.find(p => p.provider_number === '456790B')?.id,
          encounter_id: 'ENC-2024-005',
          items: [{"code": "23", "description": "Professional attendance by a general practitioner", "quantity": 1, "unitPrice": 41.20}],
          total_amount: 41.20,
          currency: 'AUD',
          notes: 'Follow-up consultation',
          submission_status: 'success',
          status: 'paid',
          created_at: new Date(now.getTime() - 12 * 24 * 60 * 60 * 1000).toISOString()
        },
        {
          patient_id: patients.find(p => p.full_name.includes('Sophia'))?.id,
          practitioner_id: practitioners.find(p => p.provider_number === '456791C')?.id,
          encounter_id: 'ENC-2024-006',
          items: [{"code": "2713", "description": "Mental Health", "quantity": 1, "unitPrice": 102.00}],
          total_amount: 102.00,
          currency: 'AUD',
          notes: 'Mental health consultation',
          submission_status: 'success',
          status: 'paid',
          created_at: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString()
        },
        {
          patient_id: patients.find(p => p.full_name.includes('Sophia'))?.id,
          practitioner_id: practitioners.find(p => p.provider_number === '456791C')?.id,
          encounter_id: 'ENC-2024-007',
          items: [
            {"code": "23", "description": "Professional attendance by a general practitioner", "quantity": 1, "unitPrice": 41.20},
            {"code": "11700", "description": "ECG", "quantity": 1, "unitPrice": 26.55}
          ],
          total_amount: 67.75,
          currency: 'AUD',
          notes: 'Consultation with ECG',
          submission_status: 'failed',
          submission_error_reason: 'Time interval violation',
          status: 'rejected',
          created_at: new Date(now.getTime() - 20 * 24 * 60 * 60 * 1000).toISOString()
        }
      ];

      // Insert the claims
      const { data, error } = await this.supa.getClient()
        .from('claims')
        .insert(sampleClaims.filter(claim => claim.patient_id && claim.practitioner_id))
        .select();

      if (error) {
        console.error('Error seeding claims:', error);
        return { error: 'Failed to seed claims', details: error };
      }

      return { 
        message: 'Successfully seeded claims data', 
        count: data?.length || 0,
        claims: data
      };

    } catch (error) {
      console.error('Error in seedClaims:', error);
      return { error: 'Failed to seed claims', details: error };
    }
  }
}
