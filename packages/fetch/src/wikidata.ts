export interface WikidataResult {
  score: 0 | 0.5 | 1;
  entity: string | null;
  entityId: string | null;
  ambiguous: boolean;
  fetchedAt: Date;
  error?: string;
}

interface WikidataSearchItem {
  id: string;
  label: string;
  description?: string;
  url?: string;
}

export async function lookupWikidata(
  brandName: string,
  fetchFn: typeof fetch = globalThis.fetch
): Promise<WikidataResult> {
  const fetchedAt = new Date();
  if (!brandName.trim()) {
    return { score: 0, entity: null, entityId: null, ambiguous: false, fetchedAt, error: "No brand name provided" };
  }

  const endpoint = new URL("https://www.wikidata.org/w/api.php");
  endpoint.searchParams.set("action", "wbsearchentities");
  endpoint.searchParams.set("search", brandName.trim());
  endpoint.searchParams.set("language", "en");
  endpoint.searchParams.set("limit", "5");
  endpoint.searchParams.set("format", "json");

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5_000);

  try {
    const res = await fetchFn(endpoint.href, {
      signal: controller.signal,
      headers: { "User-Agent": "PromptScoreBot/1.0 (+https://promptscore.co.uk/about)" },
    });

    if (!res.ok) {
      return { score: 0, entity: null, entityId: null, ambiguous: false, fetchedAt, error: `Wikidata API error ${res.status}` };
    }

    const data = await res.json() as { search?: WikidataSearchItem[] };
    const results = data.search ?? [];

    if (results.length === 0) {
      return { score: 0, entity: null, entityId: null, ambiguous: false, fetchedAt };
    }

    const normalise = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "").trim();
    const normBrand = normalise(brandName);
    const exactMatch = results.find((r) => normalise(r.label) === normBrand);

    if (exactMatch) {
      return { score: 1, entity: exactMatch.label, entityId: exactMatch.id, ambiguous: false, fetchedAt };
    }

    // Single result but not exact — treat as ambiguous
    if (results.length === 1) {
      return { score: 0.5, entity: results[0].label, entityId: results[0].id, ambiguous: true, fetchedAt };
    }

    // Multiple results, none exact
    return { score: 0.5, entity: results[0].label, entityId: results[0].id, ambiguous: true, fetchedAt };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { score: 0, entity: null, entityId: null, ambiguous: false, fetchedAt, error: msg };
  } finally {
    clearTimeout(timer);
  }
}
