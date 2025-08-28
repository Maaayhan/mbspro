import { Injectable, Logger } from "@nestjs/common";
import { supabaseClient } from "../config/supabase.config";

@Injectable()
export class SupabaseService {
  private readonly logger = new Logger(SupabaseService.name);

  getClient() {
    return supabaseClient;
  }

  async healthCheck(): Promise<boolean> {
    try {
      const { data, error } = await supabaseClient
        .from("mbs_items")
        .select("code")
        .limit(1);

      if (error) {
        this.logger.error("Supabase health check failed:", error);
        return false;
      }

      this.logger.log("Supabase health check passed");
      return true;
    } catch (error) {
      this.logger.error("Supabase health check error:", error);
      return false;
    }
  }

  async getMbsItems(limit: number = 100): Promise<any[]> {
    try {
      const { data, error } = await supabaseClient
        .from("mbs_items")
        .select("*")
        .limit(limit);

      if (error) {
        this.logger.error("Error fetching MBS items:", error);
        throw error;
      }

      return data || [];
    } catch (error) {
      this.logger.error("Error in getMbsItems:", error);
      throw error;
    }
  }

  async searchMbsItems(query: string, limit: number = 10): Promise<any[]> {
    try {
      const { data, error } = await supabaseClient
        .from("mbs_items")
        .select("*")
        .or(`title.ilike.%${query}%,description.ilike.%${query}%`)
        .limit(limit);

      if (error) {
        this.logger.error("Error searching MBS items:", error);
        throw error;
      }

      return data || [];
    } catch (error) {
      this.logger.error("Error in searchMbsItems:", error);
      throw error;
    }
  }

  async getMbsByCodes(codes: string[]): Promise<Record<string, any>> {
    try {
      if (!codes || codes.length === 0) {
        return {};
      }

      const { data, error } = await supabaseClient
        .from("mbs_items")
        .select("*")
        .in("code", codes);

      if (error) {
        this.logger.error("Error fetching MBS items by codes:", error);
        throw error;
      }

      // 转换为以code为key的映射
      const metaMap: Record<string, any> = {};
      (data || []).forEach((item) => {
        metaMap[item.code] = {
          code: item.code,
          title: item.title,
          description: item.description,
          fee: item.fee || 0,
          category: item.category,
          display: item.title, // 兼容性
        };
      });

      return metaMap;
    } catch (error) {
      this.logger.error("Error in getMbsByCodes:", error);
      throw error;
    }
  }
}
