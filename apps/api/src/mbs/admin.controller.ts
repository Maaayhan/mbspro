import { Controller, Get, Post } from '@nestjs/common';
import { KBRulesLoader } from './loader';
import { MetricsService } from './metrics.service';

@Controller('mbs-admin')
export class MbsAdminController {
  constructor(
    private readonly loader: KBRulesLoader,
    private readonly metrics: MetricsService,
  ) {}

  @Post('reload')
  reload() {
    this.loader.reload();
    const v = this.loader.getVersions();
    this.metrics.setVersions(v);
    this.metrics.setReloadedNow();
    return { ok: true, versions: v };
  }

  @Get('metrics/snapshot')
  snapshot() {
    return this.metrics.snapshot();
  }

  @Post('seed-claims')
  async seedClaims() {
    // This endpoint will seed some sample claims data
    return this.loader.seedClaims();
  }
}


