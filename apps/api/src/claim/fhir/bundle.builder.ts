/**
 * FHIR Bundle Resource Builder
 * Builds FHIR-compliant Bundle resources
 */

export interface BundleEntry {
  fullUrl?: string;
  resource: any;
  request?: {
    method: "POST" | "PUT" | "DELETE";
    url: string;
    ifNoneExist?: string;
  };
}

export interface BundleInput {
  entries: BundleEntry[];
  type:
    | "transaction"
    | "batch"
    | "searchset"
    | "collection"
    | "history"
    | "document"
    | "message";
  identifier?: {
    system?: string;
    value?: string;
  };
  timestamp?: string;
}

/**
 * Build Transaction Bundle
 * Used for creating or updating multiple FHIR resources
 */
export function buildTransactionBundle(entries: BundleEntry[]): any {
  return {
    resourceType: "Bundle",
    type: "transaction",
    entry: entries.map((entry) => {
      const bundleEntry: any = { resource: entry.resource };
      if (entry.fullUrl) bundleEntry.fullUrl = entry.fullUrl;

      if (entry.request) {
        bundleEntry.request = entry.request;
      } else {
        const rt = entry.resource?.resourceType;
        bundleEntry.request = { method: "POST", url: rt };
      }
      return bundleEntry;
    }),
  };
}

/**
 * Build SearchSet Bundle
 * Used for search results
 */
export function buildSearchSetBundle(
  resources: any[],
  total: number,
  identifier?: string
): any {
  const bundle: any = {
    resourceType: "Bundle",
    type: "searchset",
    total,
    entry: resources.map((resource) => ({
      resource,
      search: {
        mode: "match",
      },
    })),
  };

  if (identifier) {
    bundle.identifier = {
      system: "https://mbspro.com/bundle",
      value: identifier,
    };
  }

  return bundle;
}

/**
 * Build Collection Bundle
 * Used for resource collections
 */
export function buildCollectionBundle(
  resources: any[],
  identifier?: string
): any {
  const bundle: any = {
    resourceType: "Bundle",
    type: "collection",
    entry: resources.map((resource) => ({
      resource,
    })),
  };

  if (identifier) {
    bundle.identifier = {
      system: "https://mbspro.com/bundle",
      value: identifier,
    };
  }

  return bundle;
}

/**
 * Generate UUID reference for resources in Bundle
 */
export function generateFullUrl(resourceType: string, index: number): string {
  return `urn:uuid:${resourceType.toLowerCase()}-${index}`;
}

/**
 * Build Bundle metadata
 */
export function buildBundleMeta(
  profile?: string[],
  security?: Array<{
    system: string;
    code: string;
    display?: string;
  }>,
  tag?: Array<{
    system?: string;
    code: string;
    display?: string;
  }>
): any {
  const meta: any = {};

  if (profile && profile.length > 0) {
    meta.profile = profile;
  }

  if (security && security.length > 0) {
    meta.security = security;
  }

  if (tag && tag.length > 0) {
    meta.tag = tag;
  }

  return meta;
}
