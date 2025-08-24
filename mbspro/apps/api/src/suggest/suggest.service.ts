import { Injectable, Logger } from '@nestjs/common';
import { SuggestRequestDto } from './dto/suggest-request.dto';
import { SuggestResponseDto } from './dto/suggest-response.dto';
import type { SuggestResponse } from '@mbspro/shared';
import { SupabaseService } from '../services/supabase.service';
import { MbsItem, MbsItemRow } from '../entities/mbs-item.entity';

@Injectable()
export class SuggestService {
  private readonly logger = new Logger(SuggestService.name);

  constructor(private readonly supabaseService: SupabaseService) {}

  async suggest(request: SuggestRequestDto): Promise<SuggestResponseDto> {
    this.logger.log(`Processing suggestion request for note: "${request.note?.substring(0, 50)}..."`);
    
    try {
      // Search for MBS items based on the note content using SupabaseService
      const data = await this.supabaseService.searchMbsItems(request.note, 10);

      // Transform the data from database format to application format
      const candidates = (data as MbsItemRow[] || []).map(this.transformRowToItem);

      const response: SuggestResponse = {
        candidates,
        signals: undefined,
      };

      this.logger.log(`Returning ${candidates.length} candidates from Supabase`);
      
      return response;
    } catch (error) {
      this.logger.error('Error in suggest service:', error);
      // Return empty response on error
      return {
        candidates: [],
        signals: undefined,
      };
    }
  }

  private transformRowToItem(row: MbsItemRow): MbsItem {
    return {
      code: row.code,
      title: row.title,
      description: row.description,
      fee: row.fee,
      timeThreshold: row.time_threshold,
      flags: row.flags,
      mutuallyExclusiveWith: row.mutually_exclusive_with,
      references: row.reference_materials,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
