/**
 * FHIR Claim Resource Builder
 * Builds FHIR-compliant Claim resources
 */

export interface ClaimItem {
  sequence: number;
  productOrService: {
    coding: Array<{
      system: string;
      code: string;
      display?: string;
    }>;
    text?: string;
  };
  unitPrice?: {
    value: number;
    currency: string;
  };
  modifier?: Array<{
    coding: Array<{
      system: string;
      code: string;
    }>;
  }>;
  quantity?: {
    value: number;
    unit?: string;
  };
}

export interface ClaimNote {
  number?: number;
  type?: {
    coding: Array<{
      system: string;
      code: string;
      display?: string;
    }>;
  };
  text: string;
  language?: {
    coding: Array<{
      system: string;
      code: string;
    }>;
  };
}

export interface ClaimInput {
  patientId: string;
  practitionerId: string;
  encounterId: string;
  items: ClaimItem[];
  total: {
    value: number;
    currency: string;
  };
  notes?: ClaimNote[];
  status?: string;
  type?: {
    coding: Array<{
      system: string;
      code: string;
      display?: string;
    }>;
  };
  priority?: {
    coding: Array<{
      system: string;
      code: string;
      display?: string;
    }>;
  };
}

export function buildClaim(input: ClaimInput): any {
  // Build Claim type coding
  const typeCoding = input.type || {
    coding: [
      {
        system: "http://terminology.hl7.org/CodeSystem/claim-type",
        code: "professional",
        display: "Professional",
      },
    ],
  };

  // Build priority coding
  const priorityCoding = input.priority || {
    coding: [
      {
        system: "http://terminology.hl7.org/CodeSystem/processpriority",
        code: "normal",
        display: "Normal",
      },
    ],
  };

  // Build Claim resource
  const claim: any = {
    resourceType: "Claim",
    status: input.status || "draft",
    type: typeCoding,
    priority: priorityCoding,
    patient: {
      reference: `Patient/${input.patientId}`,
    },
    provider: {
      reference: `Practitioner/${input.practitionerId}`,
    },
    encounter: {
      reference: `Encounter/${input.encounterId}`,
    },
    item: input.items,
    total: input.total,
    ...(input.notes && input.notes.length > 0 && { note: input.notes }),
  };

  return claim;
}

/**
 * Build Claim item
 */
export function buildClaimItem(
  sequence: number,
  code: string,
  display: string,
  unitPrice: number,
  currency: string = "AUD",
  modifiers: string[] = [],
  quantity: number = 1
): ClaimItem {
  const item: ClaimItem = {
    sequence,
    productOrService: {
      coding: [
        {
          system:
            "https://www.health.gov.au/health-topics/medicare-benefits-schedule-mbs",
          code,
          display,
        },
      ],
      text: display,
    },
    unitPrice: {
      value: unitPrice,
      currency,
    },
    quantity: {
      value: quantity,
      unit: "1",
    },
  };

  // Add modifiers
  if (modifiers && modifiers.length > 0) {
    item.modifier = modifiers.map((modifier) => ({
      coding: [
        {
          system:
            "https://www.health.gov.au/health-topics/medicare-benefits-schedule-mbs/modifiers",
          code: modifier,
        },
      ],
    }));
  }

  return item;
}

/**
 * Build Claim note
 */
export function buildClaimNote(
  text: string,
  number?: number,
  type?: string
): ClaimNote {
  const note: ClaimNote = {
    text,
    ...(number && { number }),
    ...(type && {
      type: {
        coding: [
          {
            system: "http://terminology.hl7.org/CodeSystem/note-type",
            code: type,
            display: type === "display" ? "Display" : "Print",
          },
        ],
      },
    }),
  };

  return note;
}
