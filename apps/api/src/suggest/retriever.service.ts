import { Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from '../services/supabase.service';

export interface RetrievedRow {
  code: string;
  title: string;
  description: string;
  fee: number;
  time_threshold?: number;
  flags: Record<string, any>;
  mutually_exclusive_with: string[];
  reference_docs: string[];
  created_at: string;
  updated_at: string;
  sim_title?: number;
  sim_desc?: number;
  sim?: number;
}

@Injectable()
export class RetrieverService {
  private readonly logger = new Logger(RetrieverService.name);
  constructor(private readonly supabase: SupabaseService) {}

  async search(query: string, limit = 20): Promise<RetrievedRow[]> {
    const client = this.supabase.getClient();
    const { data, error } = await client.rpc('search_mbs_items', { q: query, limit_n: limit });
    if (error) {
      this.logger.error('Supabase RPC search_mbs_items failed', error);
      return [];
    }
    return (data as RetrievedRow[]) || [];
  }
}
