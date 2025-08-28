import { Module } from '@nestjs/common';
import { MbsCodesController } from './mbs.controller';
import { MbsCodesService } from './mbs.service';
import { MbsExtractorService } from './extractor.service';
import { LexicalRetrieverService } from './retriever.service';
import { KBRulesLoader } from './loader';
import { MetricsService } from './metrics.service';
import { AuditLogService } from './audit-log.service';
import { MbsAdminController } from './admin.controller';
import { MetricsController } from './metrics.controller';

@Module({
  controllers: [MbsCodesController, MbsAdminController, MetricsController],
  providers: [MbsCodesService, MbsExtractorService, LexicalRetrieverService, KBRulesLoader, MetricsService, AuditLogService],
  exports: [KBRulesLoader, MetricsService],
})
export class MbsModule {}
