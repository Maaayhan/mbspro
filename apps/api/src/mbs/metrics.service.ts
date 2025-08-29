import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../services/supabase.service';

@Injectable()
export class MetricsService {
  private totalRequests = 0;
  private totalDurationMs = 0;
  private lastReloadAt: string | null = null;
  private counters: Record<string, number> = {};
  private versions: { kb?: string; rules?: string } = {};

  constructor(private readonly supa: SupabaseService) {}

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

  /** Get claims data from Supabase */
  async getClaimsData(filters: {
    from?: string;
    to?: string;
    provider?: string;
    item?: string;
  }) {
    try {
      let query = this.supa.getClient()
        .from('claims')
        .select(`
          id,
          total_amount,
          items,
          status,
          submission_status,
          submission_error_reason,
          created_at,
          practitioner_id,
          mbs_practitioners!practitioner_id (
            provider_number,
            full_name
          )
        `);

      // 应用日期范围过滤
      if (filters.from) {
        query = query.gte('created_at', `${filters.from}T00:00:00.000Z`);
      }
      if (filters.to) {
        query = query.lte('created_at', `${filters.to}T23:59:59.999Z`);
      }

      // 应用提供者过滤
      if (filters.provider && filters.provider !== 'All') {
        const { data: practitioners } = await this.supa.getClient()
          .from('mbs_practitioners')
          .select('id')
          .eq('provider_number', filters.provider);
        
        if (practitioners && practitioners.length > 0) {
          query = query.eq('practitioner_id', practitioners[0].id);
        }
      }

      // 应用项目过滤 - 将在应用层面处理，避免数据库 JSONB 查询问题
      let shouldFilterByItem = false;
      let targetItemCode = null;
      if (filters.item && filters.item !== 'All') {
        shouldFilterByItem = true;
        targetItemCode = filters.item;
        console.log('Will filter by item code after data retrieval:', targetItemCode);
      }

      const { data, error } = await query.limit(50000);

      if (error) {
        console.error('Failed to get claims data:', error);
        return null;
      }

      // 安全地处理 items 字段
      const processedData = data?.map(claim => {
        // 确保 items 是一个有效的数组
        let processedItems = claim.items;
        try {
          // 如果 items 是字符串，尝试解析
          if (typeof claim.items === 'string') {
            // 尝试解析 JSON，如果失败则尝试处理可能的不规范 JSON
            try {
              processedItems = JSON.parse(claim.items);
            } catch {
              // 如果是不规范的 JSON，尝试修复
              const fixedJsonString = claim.items
                .replace(/'/g, '"')  // 替换单引号为双引号
                .replace(/([a-zA-Z0-9_]+):/g, '"$1":');  // 为键添加引号
              processedItems = JSON.parse(fixedJsonString);
            }
          }
          
          // 确保 processedItems 是数组
          if (!Array.isArray(processedItems)) {
            processedItems = [];
          }
        } catch (parseError) {
          processedItems = [];
        }

                 return {
           ...claim,
           items: processedItems
         };
       }) || [];

       // 在应用层面应用 item 过滤
       let finalData = processedData;
       if (shouldFilterByItem && targetItemCode) {
         finalData = processedData.filter(claim => {
           if (!claim.items || !Array.isArray(claim.items)) {
             return false;
           }
           
           return claim.items.some(item => 
             item && typeof item === 'object' && item.code === targetItemCode
           );
         });
         
         console.log(`Filtered ${processedData.length} claims to ${finalData.length} claims matching item ${targetItemCode}`);
       }

       return finalData;
    } catch (error) {
      console.error('Error getting claims data:', error);
      return null;
    }
  }

  /** Get aggregated claims statistics */
  async getClaimsStats(filters: {
    from?: string;
    to?: string;
    provider?: string;
    item?: string;
  }) {
    const claimsData = await this.getClaimsData(filters);
    
    if (!claimsData) {
      return null;
    }

    // If a specific item is provided, filter claims to only that item
    const filteredClaimsData = filters.item && filters.item !== 'All' 
      ? claimsData.filter(claim => 
          claim.items && 
          Array.isArray(claim.items) && 
          claim.items.some((item: any) => item.code === filters.item)
        )
      : claimsData;

    const totalClaims = filteredClaimsData.length;
    
    // If no claims for the specific item, return all zeros
    if (totalClaims === 0) {
      return {
        totalClaims: 0,
        totalRevenue: 0,
        errorRate: 0,
        complianceScore: 0,
        errorClaims: 0
      };
    }
    
    // Only count revenue from successful claims (not failed or rejected)
    const successfulClaims = filteredClaimsData.filter(claim => 
      claim.submission_status === 'success' && 
      (claim.status === 'paid' || claim.status === 'submitted')
    );
    const totalRevenue = successfulClaims.reduce((sum, claim) => sum + (Number(claim.total_amount) || 0), 0);
    
    // Calculate error rate based on submission status
    const errorClaims = filteredClaimsData.filter(claim => 
      claim.submission_status === 'failed' || 
      claim.status === 'rejected'
    ).length;
    const errorRate = totalClaims > 0 ? errorClaims / totalClaims : 0;
    
    // Calculate compliance score
    const complianceScore = Math.max(0, Math.min(1, 1 - errorRate));

    return {
      totalClaims,
      totalRevenue,
      errorRate,
      complianceScore,
      errorClaims
    };
  }

  /** Get top items from real claims data */
  async getTopItems(filters: {
    from?: string;
    to?: string;
    provider?: string;
    item?: string;
  }) {
    const claimsData = await this.getClaimsData(filters);
    
    if (!claimsData || claimsData.length === 0) {
      return [];
    }

    // If a specific item is provided, filter claims to only that item
    const filteredClaimsData = filters.item && filters.item !== 'All' 
      ? claimsData.filter(claim => 
          claim.items && 
          Array.isArray(claim.items) && 
          claim.items.some((item: any) => item.code === filters.item)
        )
      : claimsData;

    // If no claims for the specific item, return empty array
    if (filteredClaimsData.length === 0) {
      return [];
    }

    // Aggregate items from successful claims
    const itemStats: Record<string, { code: string; title: string; count: number; revenue: number }> = {};
    
    // Count all claims for total count, but only successful for revenue
    filteredClaimsData.forEach(claim => {
      if (claim.items && Array.isArray(claim.items)) {
        claim.items.forEach((item: any) => {
          const code = item.code;
          const title = item.description || `Item ${code}`;
          const quantity = Number(item.quantity) || 1;
          
          if (!itemStats[code]) {
            itemStats[code] = {
              code,
              title,
              count: 0,
              revenue: 0
            };
          }
          
          itemStats[code].count += quantity;
        });
      }
    });

    // Add revenue only from successful claims
    const successfulClaims = filteredClaimsData.filter(claim => 
      claim.submission_status === 'success' && 
      (claim.status === 'paid' || claim.status === 'submitted')
    );

    successfulClaims.forEach(claim => {
      if (claim.items && Array.isArray(claim.items)) {
        claim.items.forEach((item: any) => {
          const code = item.code;
          const unitPrice = Number(item.unitPrice) || 0;
          const quantity = Number(item.quantity) || 1;
          const itemRevenue = unitPrice * quantity;
          
          if (itemStats[code]) {
            itemStats[code].revenue += itemRevenue;
          }
        });
      }
    });

    // Convert to array and sort by revenue
    const sortedItems = Object.values(itemStats)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10); // Top 10 items

    // Get MBS descriptions from database
    const codes = sortedItems.map(item => item.code);
    try {
      const mbsDetails = await this.supa.getMbsByCodes(codes);
      // console.log('MBS Details fetched:', Object.keys(mbsDetails).length, 'items');
      
      // Enhance items with descriptions
      return sortedItems.map(item => {
        const mbsItem = mbsDetails[item.code];
        const enhancedDescription = mbsItem?.description || mbsItem?.title || item.title;
        
        return {
          ...item,
          description: enhancedDescription,
          // Also include the detailed title from MBS database if available
          title: mbsItem?.title || item.title
        };
      });
    } catch (error) {
      console.warn('Failed to fetch MBS descriptions:', error);
      // Return items with original descriptions if database fails
      return sortedItems.map(item => ({
        ...item,
        description: item.title
      }));
    }
  }

  /** Get real audit data */
  async getAuditData(filters: {
    from?: string;
    to?: string;
    provider?: string;
    item?: string;
    type?: 'all' | 'errors';
    limit?: number; // 添加限制参数，如果不传则返回所有
  }) {


    const claimsData = await this.getClaimsData({
      from: filters.from,
      to: filters.to,
      provider: filters.provider,
      item: filters.item
    });
    
    if (!claimsData) {
      return [];
    }


    // 记录所有 claims 的 submission_status
    const submissionStatusCounts = claimsData.reduce((acc, claim) => {
      const status = claim.submission_status || 'undefined';
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {});
    // console.log('Submission Status Counts:', submissionStatusCounts);

    // 根据 type 参数过滤 claims
    let filteredClaims = claimsData;
    if (filters.type === 'errors' || filters.type === undefined) {
      filteredClaims = claimsData.filter(claim => claim.submission_status === 'failed');
    } else if (filters.type === 'all') {
      filteredClaims = claimsData;
    } else {
      // 如果指定了未知的 type，返回空数组
      filteredClaims = [];
    }



    const sortedClaims = filteredClaims
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    
    // 根据 limit 参数决定是否限制数量
    const limitedClaims = filters.limit ? sortedClaims.slice(0, filters.limit) : sortedClaims;
    
    return limitedClaims
      .map(claim => {
        const practitioner = claim.mbs_practitioners as any;
        const providerName = practitioner?.full_name || 'Unknown Provider';
        
        // Extract item codes
        const itemCodes = claim.items && Array.isArray(claim.items) 
          ? claim.items.map((item: any) => item.code).join(', ')
          : 'Unknown';
        
        const reason = claim.submission_error_reason || 'Submission failed';
        
        // 根据 submission_status 确定最终状态
        const status: 'Accepted' | 'Rejected' = 
          claim.submission_status === 'success' ? 'Accepted' : 
          claim.submission_status === 'failed' ? 'Rejected' : 
          'Rejected';
        
        return {
          date: new Date(claim.created_at).toISOString().split('T')[0],
          claimId: claim.id,
          provider: providerName,
          items: itemCodes,
          reason: reason,
          status: status,
          submission_status: claim.submission_status
        };
      });
  }

  /** Get revenue trend data */
  async getRevenueTrend(filters: {
    from?: string;
    to?: string;
    provider?: string;
    item?: string;
  }) {
    try {
      const claimsData = await this.getClaimsData(filters);

      if (!claimsData || claimsData.length === 0) {
        return [];
      }

      // 只统计成功的claims
      const successfulClaims = claimsData.filter(claim => 
        claim.submission_status === 'success' && 
        (claim.status === 'paid' || claim.status === 'submitted')
      );

      // 按月聚合收入
      const monthlyRevenue: Record<string, number> = {};
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

      // 如果有from和to过滤器，进一步过滤日期
      const filteredClaims = successfulClaims.filter(claim => {
        const claimDate = new Date(claim.created_at);
        if (filters.from) {
          const fromDate = new Date(filters.from);
          if (claimDate < fromDate) return false;
        }
        if (filters.to) {
          const toDate = new Date(filters.to);
          if (claimDate > toDate) return false;
        }
        return true;
      });

      filteredClaims.forEach(claim => {
        const date = new Date(claim.created_at);
        const monthKey = months[date.getMonth()];
        const revenue = Number(claim.total_amount) || 0;
        
        if (!monthlyRevenue[monthKey]) {
          monthlyRevenue[monthKey] = 0;
        }
        monthlyRevenue[monthKey] += revenue;
      });

      // 生成最近6个月数据
      const result = [];
      const now = new Date();
      
      for (let i = 5; i >= 0; i--) {
        const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthKey = months[monthDate.getMonth()];
        result.push({
          month: monthKey,
          value: Math.round(monthlyRevenue[monthKey] || 0)
        });
      }

      return result;
    } catch (error) {
      console.error('Error getting revenue trend:', error);
      return [];
    }
  }
}


