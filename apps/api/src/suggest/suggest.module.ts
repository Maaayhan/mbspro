import { Module } from '@nestjs/common';
import { SuggestController } from './suggest.controller';
import { SuggestService } from './suggest.service';
import { SupabaseService } from '../services/supabase.service';
import { SignalExtractorService } from './signal-extractor.service';
import { RankerService } from './ranker.service';
import { ExplainService } from './explain.service';
import { RuleEngineService } from './rule-engine.service';
import { RagModule } from '../rag/rag.module';
import { MetricsService } from '../mbs/metrics.service';
import { LexicalRetrieverService } from '../mbs/retriever.service';
import { PatientsController } from './patients.controller';

@Module({
  imports: [RagModule],
  controllers: [SuggestController, PatientsController],
  providers: [
    SuggestService,
    SupabaseService,
    SignalExtractorService,
    RankerService,
    ExplainService,
    RuleEngineService,
    MetricsService,
    LexicalRetrieverService,
  ],
})
export class SuggestModule {}
