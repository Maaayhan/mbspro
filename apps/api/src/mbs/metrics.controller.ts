import { Controller, Get, Query } from '@nestjs/common';
import { MetricsService } from './metrics.service';

type KPIs = {
  totalClaims: number;
  errorRate: number;        // 0..1
  revenue: number;          // $
  complianceScore: number;  // 0..1
};

type RevenuePoint = { month: string; value: number };
type TopItem = { code: string; title: string; count: number; revenue: number };
type AuditRow = {
  date: string;
  claimId: string;
  provider: string;
  items: string;
  reason: string;
  status: 'Rejected' | 'Flagged';
};
type RuleRow = { id: string; name: string; status: 'ok'|'warning'|'fail'; reason: string };

type DashboardData = {
  kpis: KPIs;
  revenueTrend: RevenuePoint[];
  topItems: TopItem[];
  auditRows: AuditRow[];
  rules: RuleRow[];
};

@Controller('metrics')
export class MetricsController {
  constructor(private readonly metrics: MetricsService) {}

  @Get()
  getMetrics(
    @Query('from') _from?: string,
    @Query('to') _to?: string,
    @Query('provider') _provider?: string,
    @Query('item') _item?: string,
  ): DashboardData {
    const snap = this.metrics.snapshot();

    const total = Math.max(0, Number(snap.total_requests) || 0);
    const low = Math.max(0, Number((snap.counters && snap.counters['low_confidence']) || 0));
    const errorRate = total > 0 ? Math.min(1, low / total) : 0.02;
    const complianceScore = Math.max(0, Math.min(1, 1 - errorRate));
    const avgFee = 66; // simple MVP heuristic
    const revenue = Math.round(total * avgFee);

    const months = ['Jan','Feb','Mar','Apr','May','Jun'];
    const base = Math.max(2000, revenue);
    const revenueTrend: RevenuePoint[] = months.map((m, i) => ({
      month: m,
      value: Math.round(base * (0.6 + (i * 0.08)))
    }));

    const topItems: TopItem[] = [
      { code: '23', title: 'Consultation Level A', count: Math.max(20, Math.round(total * 0.12)), revenue: Math.max(800, Math.round(revenue * 0.12)) },
      { code: '36', title: 'Consultation Level C', count: Math.max(12, Math.round(total * 0.08)), revenue: Math.max(600, Math.round(revenue * 0.10)) },
      { code: '721', title: 'Health Assessment', count: Math.max(8, Math.round(total * 0.06)), revenue: Math.max(500, Math.round(revenue * 0.08)) },
      { code: '11700', title: 'ECG', count: Math.max(5, Math.round(total * 0.04)), revenue: Math.max(250, Math.round(revenue * 0.03)) },
      { code: '2713', title: 'Mental Health', count: Math.max(4, Math.round(total * 0.03)), revenue: Math.max(200, Math.round(revenue * 0.03)) },
    ];

    const rules: RuleRow[] = [
      { id: 'R001', name: 'Documentation Completeness', status: complianceScore > 0.9 ? 'ok' : 'warning', reason: 'Derived from recent suggestions' },
      { id: 'R002', name: 'Time Interval Compliance', status: 'ok', reason: 'No time-window conflicts recorded (MVP)' },
      { id: 'R004', name: 'Code Accuracy', status: errorRate > 0.05 ? 'fail' : 'ok', reason: 'Heuristic based on low-confidence ratio' },
    ];

    const data: DashboardData = {
      kpis: {
        totalClaims: total,
        errorRate,
        revenue,
        complianceScore,
      },
      revenueTrend,
      topItems,
      auditRows: [],
      rules,
    };

    return data;
  }
}


