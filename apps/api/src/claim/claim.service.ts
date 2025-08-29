import { BadRequestException, Injectable } from "@nestjs/common";
import { BuildClaimDto } from "./dto/build-claim.dto";
import { SubmitBundleDto } from "./dto/submit-bundle.dto";
import {
  postBundle,
  postResource,
  getClaims,
  getClaimsCount,
  getClaimsByPatient,
} from "./hapi.client";
import { SupabaseService } from "../services/supabase.service";
import { buildEncounter } from "./fhir/encounter.builder";
import { buildTransactionBundle, generateFullUrl } from "./fhir/bundle.builder";
import {
  buildClaim,
  buildClaimItem,
  buildClaimNote,
} from "./fhir/claim.builder";
import { MBS } from "./fhir/mbs-catalog"; // Used as fallback

@Injectable()
export class ClaimService {
  constructor(private readonly supa: SupabaseService) {}

  private money(v: number, currency = "AUD") {
    return { value: Number((v ?? 0).toFixed(2)), currency };
  }

  private async getMbsMetadata(codes: string[]): Promise<Record<string, any>> {
    // Priority: Supabase first, fallback to local MBS constants if failed
    try {
      return await this.supa.getMbsByCodes(codes);
    } catch {
      return {}; // Keep empty, will use local constants as fallback
    }
  }

  private buildClaimItems(
    selected: BuildClaimDto["selected"],
    metaMap: Record<string, any>,
    currency: string
  ) {
    return selected.map((item, index) => {
      const supaMeta = metaMap[item.code];
      const fallbackMeta = MBS[item.code]; // May be undefined
      const meta = supaMeta ??
        fallbackMeta ?? {
          code: item.code,
          title: item.display ?? item.code,
          fee: 0,
        };

      const display = meta?.title ?? item.display ?? meta?.display ?? item.code;
      const feeFromCatalog = Number(meta?.fee ?? 0);
      const price =
        typeof item.unitPrice === "number"
          ? Number(item.unitPrice)
          : feeFromCatalog;

      return buildClaimItem(
        index + 1,
        item.code,
        display,
        price,
        currency,
        item.modifiers || []
      );
    });
  }

  private buildClaimNotes(meta?: BuildClaimDto["meta"]) {
    const notes: any[] = [];
    if (!meta) return notes;

    if (meta.rawNote) {
      notes.push(buildClaimNote(meta.rawNote, 1, "display"));
    }

    if (meta.durationMinutes != null) {
      notes.push(
        buildClaimNote(
          `Duration: ${meta.durationMinutes} minutes`,
          2,
          "display"
        )
      );
    }

    if (meta.visitType) {
      notes.push(buildClaimNote(`Visit Type: ${meta.visitType}`, 3, "display"));
    }

    (meta.ruleNotes || []).forEach((note, index) => {
      if (note) {
        notes.push(buildClaimNote(note, 4 + index, "display"));
      }
    });

    return notes;
  }

  /** Build and submit a single Claim (requires frontend to provide encounterId) */
  async buildAndSubmit(dto: BuildClaimDto) {
    try {
      // 验证输入数据
      if (!dto.selected?.length) {
        console.warn('❌ No selected items in claim');
        throw new BadRequestException("selected items must not be empty");
      }

    const currency = dto.currency ?? "AUD";
    const codes = dto.selected.map((s) => s.code);

    // Get MBS metadata
    const metaMap = await this.getMbsMetadata(codes);

    // Build Claim items
    const items = this.buildClaimItems(dto.selected, metaMap, currency);

    // Calculate total price
    const total = items.reduce(
      (sum, item) => sum + (item.unitPrice?.value || 0),
      0
    );

    // Build notes
    const notes = this.buildClaimNotes(dto.meta);

    // Use FHIR builder to build Claim
    const claim = buildClaim({
      patientId: dto.patientId,
      practitionerId: dto.practitionerId,
      encounterId: dto.encounterId,
      items,
      total: this.money(total, currency),
      notes: notes.length > 0 ? notes : undefined,
    });

      // Store claim in Supabase
      const claimData = {
        patient_id: dto.patientId,
        practitioner_id: dto.practitionerId,
        encounter_id: dto.encounterId,
        items: dto.selected,
        total_amount: total,
        currency: currency,
        notes: dto.meta?.rawNote || "",
        status: "submitted",
        fhir_data: claim, // Store FHIR data for validation
        submission_status: "success" as const, // 默认为成功
        submission_error_reason: null,
        created_at: new Date().toISOString(),
      };

    const created = await this.supa.createClaim(claimData);

      try {
        const created = await this.supa.createClaim(claimData);
        console.log('✅ Claim Successfully Stored in Supabase');

        return {
          claim: created,
          fhir: claim,
        };
      } catch (storageError) {
        console.error('❌ Supabase Storage Error:', storageError);
        throw storageError;
      }
    } catch (error) {
      // 如果发生错误，记录错误并存储失败的 Claim
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('❌ Claim Submission Error:', errorMessage);
      console.error('Full Error Object:', error);

      const failedClaimData = {
        patient_id: dto.patientId,
        practitioner_id: dto.practitionerId,
        encounter_id: dto.encounterId,
        items: dto.selected,
        total_amount: 0, // 可能无法计算总金额
        currency: dto.currency ?? "AUD",
        notes: dto.meta?.rawNote || "",
        status: "failed",
        submission_status: "failed" as const,
        submission_error_reason: errorMessage,
        created_at: new Date().toISOString(),
      };

      try {
        const failedClaim = await this.supa.createClaim(failedClaimData);
        console.log('⚠️ Failed Claim Stored in Supabase:', JSON.stringify(failedClaim, null, 2));

        throw new BadRequestException({
          message: "Claim submission failed",
          error: errorMessage,
          failedClaim,
        });
      } catch (storageError) {
        console.error('❌ Failed to Store Failed Claim:', storageError);
        
        throw new BadRequestException({
          message: "Claim submission failed",
          error: errorMessage,
          failedClaimData, // 使用原始的 failedClaimData
        });
      }
    }
  }

  /** Automatically create Encounter + Claim transaction bundle  */
  async submitBundle(dto: SubmitBundleDto) {
    if (!dto.selected?.length)
      throw new BadRequestException("selected items must not be empty");

    const currency = dto.currency ?? "AUD";
    const entries: any[] = [];

    // 1) Patient：自动创建或使用现有资源
    let patientRef = dto.patientId;
    const isPatientDirectRef =
      /^urn:/i.test(patientRef) ||
      patientRef.includes("/") ||
      /^https?:\/\//i.test(patientRef);

    if (!isPatientDirectRef) {
      const patientUrn = generateFullUrl("Patient", 0);
      entries.push({
        fullUrl: patientUrn,
        resource: {
          resourceType: "Patient",
          identifier: [{ system: "urn:mrn", value: patientRef }],
          name: [
            {
              family: "Demo",
              given: [patientRef.replace("DEMO-PAT-", "Patient")],
            },
          ],
        },
        request: {
          method: "POST",
          url: "Patient",
          ifNoneExist: `identifier=urn:mrn|${patientRef}`,
        },
      });
      patientRef = patientUrn; // 用 URN 引用
    }

    // 2) Practitioner：⭐ 新增：若不是直接引用(URN/Resource/id/URL)，则在事务中 upsert
    let practitionerRef = dto.practitionerId;
    const isDirectRef =
      /^urn:/i.test(practitionerRef) ||
      practitionerRef.includes("/") ||
      /^https?:\/\//i.test(practitionerRef);

    if (!isDirectRef) {
      const pracUrn = generateFullUrl("Practitioner", 0); // URN 只要字符串不同即可
      entries.push({
        fullUrl: pracUrn,
        resource: {
          resourceType: "Practitioner",
          identifier: [{ system: "urn:prac", value: practitionerRef }],
          name: [{ family: "Demo", given: [practitionerRef] }],
        },
        request: {
          method: "POST",
          url: "Practitioner",
          ifNoneExist: `identifier=urn:prac|${practitionerRef}`,
        },
      });
      practitionerRef = pracUrn; // 用 URN 引用，避免 external reference
    }

    // 3) Encounter：用 URN 引用的 Patient/Practitioner
    const encounterRef = generateFullUrl("Encounter", 0);
    const encounter = buildEncounter(
      dto.encounter,
      patientRef!,
      practitionerRef!
    );
    entries.push({ fullUrl: encounterRef, resource: encounter });

    // 4) Claim items/notes/total
    const codes = dto.selected.map((s) => s.code);
    const metaMap = await this.getMbsMetadata(codes);
    const items = this.buildClaimItems(dto.selected, metaMap, currency);
    const total = items.reduce(
      (sum, it) => sum + (it.unitPrice?.value || 0),
      0
    );
    const notes = this.buildClaimNotes(dto.meta);

    // 5) Claim：同样引用 URN encounter/patient/practitioner（buildClaim 已支持 toRef）
    const claim = buildClaim({
      patientId: patientRef!,
      practitionerId: practitionerRef!,
      encounterId: encounterRef,
      items,
      total: this.money(total, currency),
      notes: notes.length ? notes : undefined,
      status: "active",
    });
    entries.push({ resource: claim });

    const bundle = buildTransactionBundle(entries);
    const created = await postBundle(bundle); // 这里会直接 POST 到 /fhir/
    return { claim, bundle, hapi: created };
  }

  /** Build Claim without submitting (for preview) */
  async buildClaim(dto: BuildClaimDto) {
    if (!dto.selected?.length) {
      throw new BadRequestException("selected items must not be empty");
    }
    const currency = dto.currency ?? "AUD";
    const codes = dto.selected.map((s) => s.code);

    // Get MBS metadata
    const metaMap = await this.getMbsMetadata(codes);

    // Build Claim items
    const items = this.buildClaimItems(dto.selected, metaMap, currency);

    // Calculate total price
    const total = items.reduce(
      (sum, item) => sum + (item.unitPrice?.value || 0),
      0
    );

    // Build notes
    const notes = this.buildClaimNotes(dto.meta);

    // Use FHIR builder to build Claim
    const claim = buildClaim({
      patientId: dto.patientId,
      practitionerId: dto.practitionerId,
      encounterId: dto.encounterId,
      items,
      total: this.money(total, currency),
      notes: notes.length > 0 ? notes : undefined,
    });

    return { claim };
  }

  /** Get claims statistics */
  async getClaimsStats() {
    try {
      // Get claims data from Supabase
      const claims = await this.supa.getAllClaims();
      const total = claims.length || 0;

      // Calculate total amount from claims
      let totalAmount = 0;
      if (claims.length > 0) {
        totalAmount = claims.reduce((sum, claim) => {
          return sum + (claim.total_amount || 0);
        }, 0);
      }

      return {
        total,
        totalAmount: Number(totalAmount.toFixed(2)),
        recentClaims: claims.slice(0, 10), // Get last 10 claims
        currency: "AUD",
      };
    } catch (error) {
      console.warn("Supabase not available, using mock data:", error);
      // Return mock data when Supabase is not available
      return {
        total: 156, // Mock total claims count
        totalAmount: 82400, // Mock total amount
        recentClaims: [],
        currency: "AUD",
      };
    }
  }

  /** Get all claims */
  async getAllClaims(
    params: {
      _count?: string;
      _sort?: string;
      patient?: string;
      _lastUpdated?: string;
    } = {}
  ) {
    try {
      return await getClaims(params);
    } catch (error) {
      console.error("Failed to get claims:", error);
      throw error;
    }
  }

  /** Get claims for a specific patient */
  async getPatientClaims(patientId: string) {
    try {
      return await getClaimsByPatient(patientId);
    } catch (error) {
      console.error("Failed to get patient claims:", error);
      throw error;
    }
  }

  /** Get all providers */
  async getProviders() {
    try {
      const { data, error } = await this.supa.getClient()
        .from('mbs_practitioners')
        .select('provider_number, full_name')
        .order('full_name');

      if (error) {
        console.error("Failed to get providers:", error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error("Failed to get providers:", error);
      return [];
    }
  }

  /** Get unique item codes from claims */
  async getItems() {
    try {
      const { data, error } = await this.supa.getClient()
        .from('claims')
        .select('items')
        .not('items', 'is', null);

      if (error) {
        console.error("Failed to get items:", error);
        return [];
      }

      // Extract unique MBS codes from claims items
      const itemCodes = new Set<string>();
      data?.forEach(claim => {
        if (claim.items && Array.isArray(claim.items)) {
          claim.items.forEach((item: any) => {
            if (item.code) {
              itemCodes.add(item.code);
            }
          });
        }
      });

      // Get MBS item details for these codes
      const codes = Array.from(itemCodes);
      if (codes.length === 0) {
        return [];
      }

      const { data: mbsItems, error: mbsError } = await this.supa.getClient()
        .from('mbs_items')
        .select('code, title')
        .in('code', codes)
        .order('code');

      if (mbsError) {
        console.error("Failed to get MBS items:", mbsError);
        return codes.map(code => ({ code, title: `Item ${code}` }));
      }

      return mbsItems || [];
    } catch (error) {
      console.error("Failed to get items:", error);
      return [];
    }
  }

  /** Get top MBS items from claims */
  async getTopItems(top: number = 5) {
    try {
      // 直接从claims表中提取和聚合items
      const { data, error } = await this.supa.getClient()
        .from('claims')
        .select('items')
        .not('items', 'is', null);

      if (error) {
        console.error('Failed to get claims items:', error);
        return [];
      }

      // 手动聚合和计算items
      const itemStats: Record<string, { 
        code: string; 
        count: number; 
        revenue: number; 
        title?: string 
      }> = {};

      data.forEach(claim => {
        if (claim.items && Array.isArray(claim.items)) {
          claim.items.forEach((item: any) => {
            const code = item.code;
            const unitPrice = Number(item.unitPrice) || 0;

            if (code && unitPrice > 0) {
              if (!itemStats[code]) {
                itemStats[code] = { 
                  code, 
                  count: 0, 
                  revenue: 0 
                };
              }
              
              itemStats[code].count += 1;
              itemStats[code].revenue += unitPrice;
            }
          });
        }
      });

      // 转换为数组并排序
      const sortedItems = Object.values(itemStats)
        .sort((a, b) => b.count - a.count)
        .slice(0, top);

      // 获取MBS项目的标题
      const codes = sortedItems.map(item => item.code);
      const { data: mbsItems } = await this.supa.getClient()
        .from('mbs_items')
        .select('code, title')
        .in('code', codes);

      // 合并标题
      return sortedItems.map(item => {
        const mbsItem = mbsItems?.find(m => m.code === item.code);
        return {
          ...item,
          title: mbsItem?.title || `Item ${item.code}`
        };
      });

    } catch (error) {
      console.error('Error getting top items:', error);
      return [];
    }
  }
}
