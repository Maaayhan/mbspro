import { Injectable, Logger } from '@nestjs/common';
import { SuggestRequestDto } from './dto/suggest-request.dto';
import { SuggestResponseDto } from './dto/suggest-response.dto';
import type { SuggestResponse } from '@mbspro/shared';

@Injectable()
export class SuggestService {
  private readonly logger = new Logger(SuggestService.name);

  async suggest(request: SuggestRequestDto): Promise<SuggestResponseDto> {
    this.logger.log(`Processing suggestion request for note: "${request.note?.substring(0, 50)}..."`);
    
    // Day-1 placeholder implementation
    // Returns empty candidates array and no signals
    const response: SuggestResponse = {
      candidates: [],
      signals: undefined,
    };

    this.logger.log('Returning placeholder response with empty candidates');
    
    return response;
  }
}
