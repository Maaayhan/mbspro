import { Controller, Get, Query, Res } from '@nestjs/common';
import { MetricsService } from './metrics.service';
import { Response } from 'express';

type KPIs = {
  totalClaims: number;
  errorRate: number;        // 0..1
  revenue: number;          // $
  complianceScore: number;  // 0..1
};

type RevenuePoint = { month: string; value: number };
type TopItem = { code: string; title: string; count: number; revenue: number; description?: string };
type AuditRow = {
  date: string;
  claimId: string;
  provider: string;
  items: string;
  reason: string;
  status: 'Accepted' | 'Rejected';
  submission_status?: string;  // 添加可选的 submission_status
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
  async getMetrics(
    @Query('from') _from?: string,
    @Query('to') _to?: string,
    @Query('provider') _provider?: string,
    @Query('item') _item?: string,
    @Query('type') _type?: 'all' | 'errors'
  ): Promise<DashboardData> {

    // Try to get real claims data first
    const realStats = await this.metrics.getClaimsStats({
      from: _from,
      to: _to,
      provider: _provider,
      item: _item
    });

    // Use real data or default to 0 if no data
    const kpis = realStats ? {
      totalClaims: realStats.totalClaims,
      errorRate: realStats.errorRate,
      revenue: realStats.totalRevenue,
      complianceScore: realStats.complianceScore
    } : {
      totalClaims: 0,
      errorRate: 0,
      revenue: 0,
      complianceScore: 0
    };

    // Get real revenue trend data
    const realRevenueTrend = realStats 
      ? await this.metrics.getRevenueTrend({})
      : [];

    // Use real revenue trend or empty array
    const revenueTrend: RevenuePoint[] = realRevenueTrend.length > 0 ? realRevenueTrend : [];

    // Get real top items data
    const realTopItems = realStats 
      ? await this.metrics.getTopItems({ from: _from, to: _to, provider: _provider, item: _item })
      : [];

    // Use real top items or empty array
    const topItems: TopItem[] = realTopItems.length > 0 ? realTopItems : [];

    const rules: RuleRow[] = [
      { id: 'R001', name: 'Documentation Completeness', status: kpis.complianceScore > 0.9 ? 'ok' : 'warning', reason: 'Derived from recent suggestions' },
      { id: 'R002', name: 'Time Interval Compliance', status: 'ok', reason: 'No time-window conflicts recorded (MVP)' },
      { id: 'R004', name: 'Code Accuracy', status: kpis.errorRate > 0.05 ? 'fail' : 'ok', reason: 'Heuristic based on low-confidence ratio' },
    ];

    // Get real audit data (限制为6条，用于页面显示)
    const realAuditData = realStats 
      ? await this.metrics.getAuditData({ 
          from: _from, 
          to: _to, 
          provider: _provider, 
          item: _item,
          type: _type ?? 'errors',
          limit: 6
        })
      : [];

    // Use real audit data or empty array
    const auditRows = realAuditData.length > 0 ? realAuditData : [];

    const data: DashboardData = {
      kpis,
      revenueTrend,
      topItems,
      auditRows,
      rules,
    };

    return data;
  }

  @Get('export/audit')
  async exportAuditData(
    @Res() res: Response,
    @Query('from') _from?: string,
    @Query('to') _to?: string,
    @Query('provider') _provider?: string,
    @Query('item') _item?: string,
    @Query('type') _type?: 'all' | 'errors'
  ) {

    // 导出时不限制数量，返回所有符合条件的数据
    const auditData = await this.metrics.getAuditData({
      from: _from,
      to: _to,
      provider: _provider,
      item: _item,
      type: _type
      // 注意：不添加 limit 参数，返回所有数据
    });

    // 如果是仅导出错误，则过滤
    const filteredData = _type === 'errors' 
      ? auditData.filter(row => row.status === 'Rejected' || row.submission_status === 'failed')
      : auditData;

    // 如果没有数据，返回204 No Content
    if (filteredData.length === 0) {
      res.status(204).send();
      return;
    }

    // 生成CSV内容，使用更安全的转义方法
    const csvHeader = [
      'Date', 
      'Claim ID', 
      'Provider', 
      'Items', 
      'Reason', 
      'Status',
      'Submission Status'  // 添加 Submission Status 列
    ];

    const csvRows = filteredData.map(row => [
      row.date,
      row.claimId,
      `"${row.provider.replace(/"/g, '""')}"`,  // 转义双引号
      `"${row.items.replace(/"/g, '""')}"`,     // 转义双引号
      `"${row.reason.replace(/"/g, '""')}"`,    // 转义双引号
      row.status,
      row.submission_status || ''  // 添加 submission_status，如果为空则使用空字符串
    ]);

    const csvContent = [
      csvHeader.join(','),
      ...csvRows.map(row => row.join(','))
    ].join('\n');

    // 设置响应头
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=audit_${_type || 'all'}_${new Date().toISOString().split('T')[0]}.csv`);
    
    // 发送CSV内容
    res.send(csvContent);
  }
}


