import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { HealthModule } from './health/health.module';
import { SuggestModule } from './suggest/suggest.module';

@Module({
  imports: [
    HealthModule,
    SuggestModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
