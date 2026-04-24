import { XMLParser } from "fast-xml-parser";

const FETCH_TIMEOUT_MS = 10_000;
const MAX_URLS = 1_000;
const MAX_DEPTH = 2;
const SITEMAP_UA = "PromptScoreBot/1.0";

const FALLBACK_PATHS = ["/sitemap.xml", "/sitemap_index.xml", "/sitemap-index.xml"];

export interface SitemapEntry {
  loc: string;
  lastmod?: string;
}

export interface SitemapAnalysis {
  present: boolean;
  /** Up to 1000 URL entries found across all sitemaps */
  entries: SitemapEntry[];
  /** The URL that successfully returned a sitemap, or null */
  sourceUrl: string | null;
  errors: string[];
}

export interface SitemapResult {
  analysis: SitemapAnalysis;
  fetchedAt: Date;
}

const xmlParser = new XMLParser({ ignoreAttributes: false });

// ---- helpers ----

function toArray<T>(val: T | T[] | undefined): T[] {
  if (val === undefined || val === null) return [];
  return Array.isArray(val) ? val : [val];
}

async function fetchText(
  url: string,
  fetchFn: typeof fetch
): Promise<{ text: string; status: number } | null> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    let res: Response;
    try {
      res = await fetchFn(url, {
        signal: controller.signal,
        headers: { "User-Agent": SITEMAP_UA },
      });
    } finally {
      clearTimeout(timer);
    }
    if (!res.ok) return null;
    return { text: await res.text(), status: res.status };
  } catch {
    return null;
  }
}

export function parseSitemapXmlForTest(xml: string): {
  entries: SitemapEntry[];
  childUrls: string[];
  isSitemapIndex: boolean;
} {
  return parseSitemapXml(xml);
}

function parseSitemapXml(xml: string): {
  entries: SitemapEntry[];
  childUrls: string[];
  isSitemapIndex: boolean;
} {
  let parsed: Record<string, unknown>;
  try {
    parsed = xmlParser.parse(xml) as Record<string, unknown>;
  } catch {
    return { entries: [], childUrls: [], isSitemapIndex: false };
  }

  // Sitemap index
  const indexNode = parsed["sitemapindex"] as Record<string, unknown> | undefined;
  if (indexNode) {
    const sitemaps = toArray<Record<string, unknown>>(
      indexNode["sitemap"] as Record<string, unknown> | Record<string, unknown>[]
    );
    const childUrls = sitemaps
      .map((s) => String(s["loc"] ?? ""))
      .filter(Boolean);
    return { entries: [], childUrls, isSitemapIndex: true };
  }

  // Standard urlset
  const urlset = parsed["urlset"] as Record<string, unknown> | undefined;
  if (urlset) {
    const urls = toArray<Record<string, unknown>>(
      urlset["url"] as Record<string, unknown> | Record<string, unknown>[]
    );
    const entries: SitemapEntry[] = urls
      .map((u) => ({
        loc: String(u["loc"] ?? ""),
        lastmod: u["lastmod"] ? String(u["lastmod"]) : undefined,
      }))
      .filter((e) => e.loc);
    return { entries, childUrls: [], isSitemapIndex: false };
  }

  return { entries: [], childUrls: [], isSitemapIndex: false };
}

/**
 * Recursively fetch and parse sitemaps.
 * Respects MAX_DEPTH and MAX_URLS caps.
 */
async function collectEntries(
  url: string,
  fetchFn: typeof fetch,
  depth: number,
  entries: SitemapEntry[],
  errors: string[]
): Promise<void> {
  if (entries.length >= MAX_URLS) return;

  const result = await fetchText(url, fetchFn);
  if (!result) {
    errors.push(`Failed to fetch sitemap: ${url}`);
    return;
  }

  const { entries: found, childUrls, isSitemapIndex } = parseSitemapXml(result.text);

  if (isSitemapIndex && depth < MAX_DEPTH) {
    // Fetch children in parallel (capped)
    await Promise.all(
      childUrls.slice(0, 20).map((childUrl) =>
        collectEntries(childUrl, fetchFn, depth + 1, entries, errors)
      )
    );
    return;
  }

  for (const entry of found) {
    if (entries.length >= MAX_URLS) break;
    entries.push(entry);
  }
}

/**
 * Fetch and parse sitemap(s) for a given site.
 *
 * Tries candidate URLs in order:
 * 1. Any URLs supplied from robots.txt Sitemap: directives
 * 2. Fallback paths: /sitemap.xml, /sitemap_index.xml, /sitemap-index.xml
 *
 * Never throws.
 */
export async function fetchSitemap(
  siteUrl: string,
  opts: {
    /** Sitemap URLs from robots.txt (tried first) */
    robotsSitemapUrls?: string[];
    fetchFn?: typeof fetch;
  } = {}
): Promise<SitemapResult> {
  const fetchFn = opts.fetchFn ?? globalThis.fetch;
  const origin = new URL(siteUrl).origin;
  const fetchedAt = new Date();

  const candidates = [
    ...(opts.robotsSitemapUrls ?? []),
    ...FALLBACK_PATHS.map((p) => `${origin}${p}`),
  ];

  // Deduplicate keeping order
  const seen = new Set<string>();
  const deduped = candidates.filter((u) => {
    if (seen.has(u)) return false;
    seen.add(u);
    return true;
  });

  const entries: SitemapEntry[] = [];
  const errors: string[] = [];
  let sourceUrl: string | null = null;

  for (const candidate of deduped) {
    const result = await fetchText(candidate, fetchFn);
    if (!result) continue;

    const { entries: found, childUrls, isSitemapIndex } = parseSitemapXml(result.text);

    if (isSitemapIndex) {
      sourceUrl = candidate;
      await Promise.all(
        childUrls.slice(0, 20).map((childUrl) =>
          collectEntries(childUrl, fetchFn, 1, entries, errors)
        )
      );
      break;
    }

    if (found.length > 0) {
      sourceUrl = candidate;
      for (const entry of found) {
        if (entries.length >= MAX_URLS) break;
        entries.push(entry);
      }
      break;
    }
  }

  return {
    analysis: {
      present: sourceUrl !== null,
      entries,
      sourceUrl,
      errors,
    },
    fetchedAt,
  };
}
