import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { HealthModule } from './health/health.module';
import { SuggestModule } from './suggest/suggest.module';
import { databaseConfig } from './config/database.config';
import { MbsItem } from './entities/mbs-item.entity';

@Module({
  imports: [
    TypeOrmModule.forRoot(databaseConfig),
    TypeOrmModule.forFeature([MbsItem]),
    HealthModule,
    SuggestModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
