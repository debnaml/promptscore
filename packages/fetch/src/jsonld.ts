export interface JsonLdBlock {
  raw: string;
  parsed: unknown;
  types: string[];
}

export interface OrganizationSchema {
  name?: string;
  url?: string;
  logo?: string;
  description?: string;
  sameAs?: string[];
}

export interface JsonLdAnalysis {
  blocks: JsonLdBlock[];
  allTypes: string[];
  organization: OrganizationSchema | null;
  hasType(type: string): boolean;
  errors: string[];
}

function extractTypes(obj: unknown): string[] {
  if (!obj || typeof obj !== "object") return [];
  const record = obj as Record<string, unknown>;
  const type = record["@type"];
  if (!type) return [];
  if (typeof type === "string") return [type];
  if (Array.isArray(type)) return type.filter((t): t is string => typeof t === "string");
  return [];
}

function flattenGraph(parsed: unknown): unknown[] {
  if (!parsed || typeof parsed !== "object") return [parsed];
  const record = parsed as Record<string, unknown>;
  if (Array.isArray(record["@graph"])) {
    return record["@graph"] as unknown[];
  }
  return [parsed];
}

function extractOrganization(blocks: JsonLdBlock[]): OrganizationSchema | null {
  for (const block of blocks) {
    const items = flattenGraph(block.parsed);
    for (const item of items) {
      if (!item || typeof item !== "object") continue;
      const record = item as Record<string, unknown>;
      const types = extractTypes(item);
      if (!types.some((t) => t === "Organization" || t === "LocalBusiness")) continue;

      const logo =
        typeof record.logo === "string"
          ? record.logo
          : typeof record.logo === "object" && record.logo !== null
          ? (record.logo as Record<string, unknown>).url as string | undefined
          : undefined;

      const sameAs = Array.isArray(record.sameAs)
        ? record.sameAs.filter((s): s is string => typeof s === "string")
        : typeof record.sameAs === "string"
        ? [record.sameAs]
        : undefined;

      return {
        name: typeof record.name === "string" ? record.name : undefined,
        url: typeof record.url === "string" ? record.url : undefined,
        logo,
        description: typeof record.description === "string" ? record.description : undefined,
        sameAs,
      };
    }
  }
  return null;
}

/** Extract and parse all <script type="application/ld+json"> blocks from HTML */
export function extractJsonLd(html: string): JsonLdAnalysis {
  const errors: string[] = [];
  const blocks: JsonLdBlock[] = [];
  const allTypesSet = new Set<string>();

  const scriptRe = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match: RegExpExecArray | null;

  while ((match = scriptRe.exec(html)) !== null) {
    const raw = match[1].trim();
    if (!raw) continue;

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch (e) {
      errors.push(`Failed to parse JSON-LD block: ${e instanceof Error ? e.message : String(e)}`);
      continue;
    }

    // Handle top-level array
    const items = Array.isArray(parsed) ? parsed : [parsed];

    for (const item of items) {
      const flatItems = flattenGraph(item);
      const types: string[] = [];

      for (const flat of flatItems) {
        const t = extractTypes(flat);
        for (const type of t) {
          types.push(type);
          allTypesSet.add(type);
        }
      }

      blocks.push({ raw, parsed: item, types });
    }
  }

  const organization = extractOrganization(blocks);

  return {
    blocks,
    allTypes: Array.from(allTypesSet),
    organization,
    hasType(type: string): boolean {
      return allTypesSet.has(type);
    },
    errors,
  };
}
