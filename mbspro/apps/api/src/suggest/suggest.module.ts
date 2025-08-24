import { Module } from '@nestjs/common';
import { SuggestController } from './suggest.controller';
import { SuggestService } from './suggest.service';
import { SupabaseService } from '../services/supabase.service';
import { SignalExtractorService } from './signal-extractor.service';
import { RetrieverService } from './retriever.service';
import { RankerService } from './ranker.service';
import { ExplainService } from './explain.service';
import { LexicalRetrieverService } from './lexical-retriever.service';

@Module({
  controllers: [SuggestController],
  providers: [
    SuggestService,
    SupabaseService,
    SignalExtractorService,
    RetrieverService,
    RankerService,
    ExplainService,
    LexicalRetrieverService,
  ],
})
export class SuggestModule {}
