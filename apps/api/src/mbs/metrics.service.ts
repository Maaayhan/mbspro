import { Injectable } from '@nestjs/common';

@Injectable()
export class MetricsService {
  private totalRequests = 0;
  private totalDurationMs = 0;
  private lastReloadAt: string | null = null;
  private counters: Record<string, number> = {};
  private versions: { kb?: string; rules?: string } = {};

  recordRequest(durationMs: number, extra?: { lowConfidence?: boolean }): void {
    this.totalRequests += 1;
    this.totalDurationMs += Math.max(0, durationMs);
    if (extra?.lowConfidence) this.increment('low_confidence');
  }

  setVersions(v: { kb?: string; rules?: string }): void {
    this.versions = { ...this.versions, ...v };
  }

  setReloadedNow(): void {
    this.lastReloadAt = new Date().toISOString();
  }

  increment(key: string, by = 1): void {
    this.counters[key] = (this.counters[key] || 0) + by;
  }

  snapshot() {
    const avg = this.totalRequests > 0 ? this.totalDurationMs / this.totalRequests : 0;
    return {
      total_requests: this.totalRequests,
      avg_duration_ms: Math.round(avg),
      counters: this.counters,
      last_reload_at: this.lastReloadAt,
      versions: this.versions,
      now: new Date().toISOString(),
    };
  }
}


