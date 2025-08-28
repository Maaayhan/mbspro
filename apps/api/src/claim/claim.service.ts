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

  /** Automatically create Encounter + Claim transaction bundle (recommended for demo) */
  async submitBundle(dto: SubmitBundleDto) {
    if (!dto.selected?.length) {
      throw new BadRequestException("selected items must not be empty");
    }
    const currency = dto.currency ?? "AUD";

    // Build Encounter
    const encounter = buildEncounter(
      dto.encounter,
      dto.patientId,
      dto.practitionerId
    );

    // Generate UUID reference for Encounter
    const encounterRef = generateFullUrl("Encounter", 0);

    // Get MBS metadata
    const codes = dto.selected.map((s) => s.code);
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
      encounterId: encounterRef, // Use UUID reference
      items,
      total: this.money(total, currency),
      notes: notes.length > 0 ? notes : undefined,
    });

    // Build transaction bundle
    const bundle = buildTransactionBundle([
      { fullUrl: encounterRef, resource: encounter },
      { resource: claim },
    ]);

    const created = await postBundle(bundle);
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
