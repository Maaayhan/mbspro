import { Module } from '@nestjs/common';
import { SuggestController } from './suggest.controller';
import { SuggestService } from './suggest.service';
import { SupabaseService } from '../services/supabase.service';

@Module({
  controllers: [SuggestController],
  providers: [SuggestService, SupabaseService],
})
export class SuggestModule {}
