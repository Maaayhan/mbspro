import { postBundle } from "src/claim/hapi.client";

function urn(id: string) {
  return `urn:uuid:${id}`;
}
function rid() {
  return Math.random().toString(36).slice(2);
}

export async function submitClaimTransaction() {
  const ePatient = {
    fullUrl: urn("pat-" + rid()),
    resource: {
      resourceType: "Patient",
      identifier: [{ system: "urn:mrn", value: "PAT-123" }],
      name: [{ family: "Chen", given: ["Shiyu"] }],
    },
    request: {
      method: "POST",
      url: "Patient",
      ifNoneExist: "identifier=urn:mrn|PAT-123",
    },
  };

  const eInsurer = {
    fullUrl: urn("org-ins-" + rid()),
    resource: {
      resourceType: "Organization",
      identifier: [{ system: "urn:abn", value: "12345678901" }],
      name: "Demo Insurer",
    },
    request: {
      method: "POST",
      url: "Organization",
      ifNoneExist: "identifier=urn:abn|12345678901",
    },
  };

  const eProvider = {
    fullUrl: urn("org-pro-" + rid()),
    resource: {
      resourceType: "Organization",
      identifier: [{ system: "urn:prov", value: "CLINIC-001" }],
      name: "Demo Clinic",
    },
    request: {
      method: "POST",
      url: "Organization",
      ifNoneExist: "identifier=urn:prov|CLINIC-001",
    },
  };

  const eClaim = {
    fullUrl: urn("claim-" + rid()),
    resource: {
      resourceType: "Claim",
      status: "active",
      type: {
        coding: [
          {
            system: "http://terminology.hl7.org/CodeSystem/claim-type",
            code: "professional",
          },
        ],
      },
      use: "claim",
      patient: { reference: ePatient.fullUrl },
      created: "2023-01-01",
      insurer: { reference: eInsurer.fullUrl },
      provider: { reference: eProvider.fullUrl },
      priority: {
        coding: [
          {
            system: "http://terminology.hl7.org/CodeSystem/processpriority",
            code: "normal",
          },
        ],
      },
    },
    request: { method: "POST", url: "Claim" },
  };

  const bundle = {
    resourceType: "Bundle",
    type: "transaction",
    entry: [ePatient, eInsurer, eProvider, eClaim],
  };
  return postBundle(bundle);
}
