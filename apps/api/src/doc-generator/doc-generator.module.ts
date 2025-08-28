import { Module } from '@nestjs/common';
import { DocGeneratorController } from './doc-generator.controller';
import { DocGeneratorService } from './doc-generator.service';
import { SupabaseService } from '../services/supabase.service';

@Module({
  controllers: [DocGeneratorController],
  providers: [DocGeneratorService, SupabaseService],
})
export class DocGeneratorModule {}
