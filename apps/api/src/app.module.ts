import { Module, Logger } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { HealthModule } from './health/health.module';
import { SuggestModule } from './suggest/suggest.module';
import { RagModule } from './rag/rag.module';

const logger = new Logger('AppModule');

logger.log('🚀 Starting MBSPro API with Supabase integration');
logger.log('📊 Using Supabase client for all database operations');

@Module({
  imports: [
    // Removed TypeORM - using Supabase client directly
    HealthModule,
    SuggestModule,
    RagModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
