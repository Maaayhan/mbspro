import { Injectable, Logger } from '@nestjs/common';
import { supabaseClient } from '../config/supabase.config';

@Injectable()
export class SupabaseService {
  private readonly logger = new Logger(SupabaseService.name);

  getClient() {
    return supabaseClient;
  }

  async healthCheck(): Promise<boolean> {
    try {
      const { data, error } = await supabaseClient
        .from('mbs_items')
        .select('code')
        .limit(1);

      if (error) {
        this.logger.error('Supabase health check failed:', error);
        return false;
      }

      this.logger.log('Supabase health check passed');
      return true;
    } catch (error) {
      this.logger.error('Supabase health check error:', error);
      return false;
    }
  }

  async getMbsItems(limit: number = 100): Promise<any[]> {
    try {
      const { data, error } = await supabaseClient
        .from('mbs_items')
        .select('*')
        .limit(limit);

      if (error) {
        this.logger.error('Error fetching MBS items:', error);
        throw error;
      }

      return data || [];
    } catch (error) {
      this.logger.error('Error in getMbsItems:', error);
      throw error;
    }
  }

  async searchMbsItems(query: string, limit: number = 10): Promise<any[]> {
    try {
      const { data, error } = await supabaseClient
        .from('mbs_items')
        .select('*')
        .or(`title.ilike.%${query}%,description.ilike.%${query}%`)
        .limit(limit);

      if (error) {
        this.logger.error('Error searching MBS items:', error);
        throw error;
      }

      return data || [];
    } catch (error) {
      this.logger.error('Error in searchMbsItems:', error);
      throw error;
    }
  }
}
