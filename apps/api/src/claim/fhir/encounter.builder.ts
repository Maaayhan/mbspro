/**
 * FHIR Encounter Resource Builder
 * Builds FHIR-compliant Encounter resources
 */

export interface EncounterInput {
  visitType: "in_person" | "telehealth" | "after_hours";
  start?: string; // ISO datetime string
  end?: string; // ISO datetime string
  durationMinutes?: number;
  locationDisplay?: string;
}

function toRef(rt: string, idOrRef: string) {
  if (!idOrRef) return undefined as any;
  if (
    /^urn:uuid:/i.test(idOrRef) ||
    idOrRef.includes("/") ||
    /^https?:\/\//i.test(idOrRef)
  ) {
    return idOrRef;
  }
  return `${rt}/${idOrRef}`;
}

export function buildEncounter(
  input: EncounterInput,
  patientId: string,
  practitionerId: string
): any {
  const now = new Date();
  const start = input.start ? new Date(input.start) : now;

  let end: Date | undefined;
  if (input.durationMinutes && input.durationMinutes > 0) {
    end = new Date(start.getTime() + input.durationMinutes * 60 * 1000);
  } else if (input.end) {
    end = new Date(input.end);
  }

  const status = "finished";
  const typeCoding = {
    system: "http://terminology.hl7.org/CodeSystem/v3-ActCode",
    code: getEncounterTypeCode(input.visitType),
    display: getEncounterTypeDisplay(input.visitType),
  };
  const serviceTypeCoding = {
    system: "http://terminology.hl7.org/CodeSystem/service-type",
    code: "GP_CONSULTATION",
    display: "General Practice Consultation",
  };

  const participants = [
    {
      type: [
        {
          coding: [
            {
              system:
                "http://terminology.hl7.org/CodeSystem/v3-ParticipationType",
              code: "ATND",
              display: "attender",
            },
          ],
        },
      ],
      individual: { reference: toRef("Practitioner", practitionerId) },
    },
  ];

  const location: any[] = [];
  if (input.locationDisplay) {
    location.push({ location: { display: input.locationDisplay } });
  }

  const cls = input.visitType === "telehealth" ? "VR" : "AMB";
  return {
    resourceType: "Encounter",
    status,
    class: {
      system: "http://terminology.hl7.org/CodeSystem/v3-ActCode",
      code: cls,
      display: cls === "VR" ? "virtual" : "ambulatory",
    },
    type: [typeCoding],
    serviceType: serviceTypeCoding,
    subject: { reference: toRef("Patient", patientId) }, // ← 用 toRef
    participant: participants,
    period: {
      start: start.toISOString(),
      ...(end ? { end: end.toISOString() } : {}),
    },
    ...(location.length ? { location } : {}),
  };
}
function getEncounterTypeCode(visitType: string): string {
  switch (visitType) {
    case "telehealth":
      return "TELE";
    case "after_hours":
      return "EMER";
    case "in_person":
    default:
      return "AMB";
  }
}

function getEncounterTypeDisplay(visitType: string): string {
  switch (visitType) {
    case "telehealth":
      return "Telehealth";
    case "after_hours":
      return "Emergency";
    case "in_person":
    default:
      return "Ambulatory";
  }
}
