const BASE = (process.env.HAPI_BASE || "http://localhost:8081/fhir").replace(
  /\/$/,
  ""
);

function joinUrl(base: string, path = "/") {
  return new URL(path.replace(/^\/+/, ""), base + "/").toString();
}

async function fhirPost(
  path: string | undefined,
  body: any,
  timeoutMs = 20000
) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  const safePath = path && path.length > 0 ? path : "/";
  const url = joinUrl(BASE, safePath);
  console.log("[HAPI POST]", url);

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/fhir+json",
        Accept: "application/fhir+json",
        Prefer: "return=representation",
      },
      body: JSON.stringify(body),
      signal: controller.signal,
      redirect: "follow",
    });

    const raw = await res.text();
    const ct = res.headers.get("content-type") || "";

    if (!res.ok) {
      if (ct.includes("json")) {
        try {
          const j = JSON.parse(raw);
          throw new Error(
            `HAPI ${res.status} ${res.statusText}: ${JSON.stringify(j).slice(0, 1200)}`
          );
        } catch {
          /* ignore parse error, fallback below */
        }
      }
      throw new Error(
        `HAPI ${res.status} ${res.statusText} [${ct}]: ${raw.slice(0, 1200)}`
      );
    }

    if (!ct.includes("json")) {
      throw new Error(`HAPI returned non-JSON [${ct}]: ${raw.slice(0, 800)}`);
    }
    return JSON.parse(raw);
  } finally {
    clearTimeout(timer);
  }
}

export async function postResource(resource: any) {
  if (!resource?.resourceType) throw new Error("resourceType is required");
  return fhirPost(`/${resource.resourceType}`, resource);
}

export async function postBundle(bundle: any) {
  if (bundle?.resourceType !== "Bundle") throw new Error("Not a FHIR Bundle");
  const t = bundle?.type;
  if (t !== "transaction" && t !== "batch") {
    throw new Error("Bundle.type must be 'transaction' or 'batch'");
  }

  return fhirPost("/", bundle);
}

export async function getMetadata(): Promise<any> {
  const u = joinUrl(BASE, "/metadata?_format=json");
  const res = await fetch(u, { headers: { Accept: "application/fhir+json" } });
  const raw = await res.text();
  if (!res.ok)
    throw new Error(`GET ${u} -> ${res.status}: ${raw.slice(0, 800)}`);
  return JSON.parse(raw);
}

console.log("HAPI_BASE =", process.env.HAPI_BASE, "| Effective BASE =", BASE);
