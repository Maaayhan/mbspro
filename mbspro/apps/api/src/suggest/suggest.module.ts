import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SuggestController } from './suggest.controller';
import { SuggestService } from './suggest.service';
import { MbsItem } from '../entities/mbs-item.entity';

@Module({
  imports: [TypeOrmModule.forFeature([MbsItem])],
  controllers: [SuggestController],
  providers: [SuggestService],
  exports: [SuggestService],
})
export class SuggestModule {}
