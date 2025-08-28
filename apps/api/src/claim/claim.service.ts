import { BadRequestException, Injectable } from "@nestjs/common";
import { BuildClaimDto } from "./dto/build-claim.dto";
import { SubmitBundleDto } from "./dto/submit-bundle.dto";
import { postBundle, postResource } from "./hapi.client";
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

    const created = await postResource(claim);
    return { claim, hapi: created };
  }

  /** Automatically create Encounter + Claim transaction bundle  */
  async submitBundle(dto: SubmitBundleDto) {
    if (!dto.selected?.length)
      throw new BadRequestException("selected items must not be empty");

    const currency = dto.currency ?? "AUD";
    const entries: any[] = [];

    // 1) Patient：可选 + 事务内 upsert
    let patientRef = dto.patientId;
    if (!patientRef) {
      const patientUrn = generateFullUrl("Patient", 0);
      const patientMrn = "DEMO-PAT-001";
      entries.push({
        fullUrl: patientUrn,
        resource: {
          resourceType: "Patient",
          identifier: [{ system: "urn:mrn", value: patientMrn }],
          name: [{ family: "Demo", given: ["Patient"] }],
        },
        request: {
          method: "POST",
          url: "Patient",
          ifNoneExist: `identifier=urn:mrn|${patientMrn}`,
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
}
