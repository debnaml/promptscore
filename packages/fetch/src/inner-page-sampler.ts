import type { SitemapEntry } from "./sitemap";

export interface SampledPage {
  url: string;
  source: "sitemap" | "nav" | "main" | "fallback";
}

export interface InnerPageSample {
  pages: SampledPage[];
  warnings: string[];
}

const TARGET = 3;
const TWELVE_MONTHS_MS = 365 * 24 * 60 * 60 * 1000;

/** Extract <a href> values from within a given set of tag names in raw HTML */
function extractHrefs(html: string, ...tags: string[]): string[] {
  const hrefs: string[] = [];
  for (const tag of tags) {
    // Match opening tag and everything inside it (non-greedy, case-insensitive)
    const tagRe = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "gi");
    let tagMatch: RegExpExecArray | null;
    while ((tagMatch = tagRe.exec(html)) !== null) {
      const inner = tagMatch[1];
      const hrefRe = /href=["']([^"'#][^"']*)["']/gi;
      let hrefMatch: RegExpExecArray | null;
      while ((hrefMatch = hrefRe.exec(inner)) !== null) {
        hrefs.push(hrefMatch[1]);
      }
    }
  }
  return hrefs;
}

/** Resolve a potentially-relative href against the site origin */
function resolveHref(href: string, origin: string): string | null {
  try {
    return new URL(href, origin).href;
  } catch {
    return null;
  }
}

/** Return the top-level path prefix, e.g. "/blog/my-post" → "/blog" */
function pathPrefix(url: string): string {
  try {
    const parsed = new URL(url);
    const parts = parsed.pathname.split("/").filter(Boolean);
    return parts.length > 0 ? `/${parts[0]}` : "/";
  } catch {
    return "/";
  }
}

/**
 * Pick up to 3 inner-page URLs diverse in path prefix.
 * Priority:
 *   1. Sitemap entries with lastmod in the last 12 months
 *   2. All other sitemap entries
 *   3. <a> hrefs from <nav> then <main> in homepage HTML
 */
export function sampleInnerPages(
  siteUrl: string,
  sitemapEntries: SitemapEntry[],
  homepageHtml: string,
  now: Date = new Date()
): InnerPageSample {
  const warnings: string[] = [];
  const selected: SampledPage[] = [];
  const usedPrefixes = new Set<string>();

  let origin: string;
  try {
    origin = new URL(siteUrl).origin;
  } catch {
    warnings.push(`Invalid siteUrl: ${siteUrl}`);
    return { pages: [], warnings };
  }

  /** Add a URL to the selection if it's on the same origin, not the homepage, and prefix not yet used */
  function tryAdd(url: string, source: SampledPage["source"]): boolean {
    if (selected.length >= TARGET) return false;
    let resolved: string;
    try {
      resolved = new URL(url).href;
    } catch {
      return false;
    }
    // Same origin only
    if (!resolved.startsWith(origin)) return false;
    // Not the homepage itself
    const path = new URL(resolved).pathname;
    if (path === "/" || path === "") return false;
    // Deduplicate by prefix for diversity
    const prefix = pathPrefix(resolved);
    if (usedPrefixes.has(prefix)) return false;
    // Not already selected
    if (selected.some((p) => p.url === resolved)) return false;

    usedPrefixes.add(prefix);
    selected.push({ url: resolved, source });
    return true;
  }

  // Pass 1: recent sitemap entries (lastmod within 12 months)
  const cutoff = new Date(now.getTime() - TWELVE_MONTHS_MS);
  const recent = sitemapEntries.filter((e) => {
    if (!e.lastmod) return false;
    const d = new Date(e.lastmod);
    return !isNaN(d.getTime()) && d >= cutoff;
  });
  for (const entry of recent) {
    if (selected.length >= TARGET) break;
    tryAdd(entry.loc, "sitemap");
  }

  // Pass 2: any remaining sitemap entries
  if (selected.length < TARGET) {
    for (const entry of sitemapEntries) {
      if (selected.length >= TARGET) break;
      tryAdd(entry.loc, "sitemap");
    }
  }

  // Pass 3: nav hrefs from homepage HTML
  if (selected.length < TARGET && homepageHtml) {
    const navHrefs = extractHrefs(homepageHtml, "nav");
    for (const href of navHrefs) {
      if (selected.length >= TARGET) break;
      const resolved = resolveHref(href, origin);
      if (resolved) tryAdd(resolved, "nav");
    }
  }

  // Pass 4: main hrefs from homepage HTML
  if (selected.length < TARGET && homepageHtml) {
    const mainHrefs = extractHrefs(homepageHtml, "main");
    for (const href of mainHrefs) {
      if (selected.length >= TARGET) break;
      const resolved = resolveHref(href, origin);
      if (resolved) tryAdd(resolved, "main");
    }
  }

  if (selected.length === 0) {
    warnings.push("Could not find any inner pages to sample");
  } else if (selected.length < TARGET) {
    warnings.push(
      `Only found ${selected.length} of ${TARGET} inner pages to sample`
    );
  }

  return { pages: selected, warnings };
}
