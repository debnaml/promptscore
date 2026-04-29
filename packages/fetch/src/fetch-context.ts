import { canonicalise } from "./canonicalise";
import { fetchRobots } from "./robots";
import type { RobotsAnalysis } from "./robots";
import { fetchSitemap } from "./sitemap";
import type { SitemapAnalysis } from "./sitemap";
import { fetchLlmsTxt } from "./llms-txt";
import type { LlmsTxtAnalysis } from "./llms-txt";
import { fetchStatic } from "./static-fetch";
import type { StaticFetchResult } from "./static-fetch";
import { sampleInnerPages } from "./inner-page-sampler";
import { extractJsonLd } from "./jsonld";
import type { JsonLdAnalysis } from "./jsonld";
import { extractMeta } from "./meta";
import type { MetaAnalysis } from "./meta";
import { extractSemantic } from "./semantic";
import type { SemanticAnalysis } from "./semantic";
import { fetchPageSpeed } from "./pagespeed";
import type { PageSpeedResult } from "./pagespeed";
import { lookupWikidata } from "./wikidata";
import type { WikidataResult } from "./wikidata";
import { runBotProbes } from "./bot-probes";
import type { BotProbeResult } from "./bot-probes";

export interface PageAnalysis {
  url: string;
  static: StaticFetchResult;
  jsonLd: JsonLdAnalysis;
  meta: MetaAnalysis;
  semantic: SemanticAnalysis;
}

export interface FetchContext {
  input: { raw: string; canonical: string; urlHash: string };
  fetchedAt: Date;
  robots: RobotsAnalysis;
  sitemap: SitemapAnalysis;
  llmsTxt: LlmsTxtAnalysis;
  homepage: PageAnalysis;
  innerPages: PageAnalysis[];
  botProbes: Record<string, BotProbeResult>;
  pagespeed: PageSpeedResult | null;
  wikidataResult: WikidataResult | null;
  warnings: string[];
  errors: string[];
}

function parseHtml(
  url: string,
  fetchResult: StaticFetchResult,
  siteOrigin: string
): Pick<PageAnalysis, "jsonLd" | "meta" | "semantic"> {
  const html = fetchResult.ok ? fetchResult.html : "";
  const headers = fetchResult.ok ? fetchResult.headers : {};
  return {
    jsonLd: extractJsonLd(html),
    meta: extractMeta(html, headers),
    semantic: extractSemantic(html, siteOrigin),
  };
}

export async function buildFetchContext(
  raw: string,
  fetchFn: typeof fetch = globalThis.fetch
): Promise<FetchContext> {
  const fetchedAt = new Date();
  const warnings: string[] = [];
  const errors: string[] = [];

  // 1. Canonicalise
  let canonical: string;
  let urlHash: string;
  try {
    const result = canonicalise(raw);
    canonical = result.canonical;
    urlHash = result.urlHash;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    errors.push(`Canonicalisation failed: ${msg}`);
    // Return a minimal context rather than throwing
    const emptyRobots = (await fetchRobots("https://invalid", fetchFn)).analysis;
    return {
      input: { raw, canonical: raw, urlHash: "" },
      fetchedAt,
      robots: emptyRobots,
      sitemap: { present: false, entries: [], sourceUrl: null, errors: [] },
      llmsTxt: { present: false, valid: false, raw: null, fullRaw: null, errors: [] },
      homepage: buildEmptyPage(raw),
      innerPages: [],
      botProbes: {} as Record<string, BotProbeResult>,
      pagespeed: null,
      wikidataResult: null,
      warnings,
      errors,
    };
  }

  let origin: string;
  try {
    origin = new URL(canonical).origin;
  } catch {
    origin = canonical;
  }

  // 2. Fetch robots, sitemap, llms.txt, and homepage in parallel
  const [robotsResult, sitemapResult, llmsTxtResult, homepageStatic] = await Promise.all([
    fetchRobots(canonical, fetchFn).catch((e) => {
      errors.push(`robots.txt fetch failed: ${e instanceof Error ? e.message : String(e)}`);
      return null;
    }),
    fetchSitemap(canonical, { fetchFn }).catch((e) => {
      errors.push(`sitemap fetch failed: ${e instanceof Error ? e.message : String(e)}`);
      return null;
    }),
    fetchLlmsTxt(canonical, fetchFn).catch((e) => {
      errors.push(`llms.txt fetch failed: ${e instanceof Error ? e.message : String(e)}`);
      return null;
    }),
    fetchStatic(canonical, fetchFn).catch((e) => {
      errors.push(`Homepage fetch failed: ${e instanceof Error ? e.message : String(e)}`);
      return null;
    }),
  ]);

  const robots = robotsResult?.analysis ?? (await fetchRobots("https://invalid", fetchFn)).analysis;
  const sitemap: SitemapAnalysis = sitemapResult?.analysis ?? { present: false, entries: [], sourceUrl: null, errors: [] };
  const llmsTxt: LlmsTxtAnalysis = llmsTxtResult?.analysis ?? { present: false, valid: false, raw: null, fullRaw: null, errors: [] };

  if (!homepageStatic || !homepageStatic.ok) {
    const kind = homepageStatic && !homepageStatic.ok ? homepageStatic.kind : "network";
    const msg = homepageStatic && !homepageStatic.ok ? homepageStatic.message : "Homepage fetch returned null";
    errors.push(`Homepage fetch error (${kind}): ${msg}`);
  }

  const homepageStaticResult: StaticFetchResult = homepageStatic ?? {
    ok: false,
    kind: "network",
    status: null,
    message: "Fetch failed",
    redirectChain: [],
    fetchedAt: new Date(),
  };

  const { jsonLd: homepageJsonLd, meta: homepageMeta, semantic: homepageSemantic } = parseHtml(
    canonical,
    homepageStaticResult,
    origin
  );

  const homepage: PageAnalysis = {
    url: canonical,
    static: homepageStaticResult,
    jsonLd: homepageJsonLd,
    meta: homepageMeta,
    semantic: homepageSemantic,
  };

  // 3. Extract brand name for Wikidata (from schema or page title)
  const brandName: string =
    homepage.jsonLd.organization?.name ??
    homepage.meta.og["og:site_name"] ??
    (() => {
      try { return new URL(canonical).hostname.replace(/^www\./, ""); } catch { return ""; }
    })();

  // 4. Run external enrichment calls in parallel (PageSpeed, Wikidata, bot probes)
  const [pagespeed, wikidataResult, botProbesResult] = await Promise.all([
    fetchPageSpeed(canonical, undefined, fetchFn).catch((e) => {
      warnings.push(`PageSpeed fetch failed: ${e instanceof Error ? e.message : String(e)}`);
      return null;
    }),
    brandName
      ? lookupWikidata(brandName, fetchFn).catch((e) => {
          warnings.push(`Wikidata lookup failed: ${e instanceof Error ? e.message : String(e)}`);
          return null;
        })
      : Promise.resolve(null),
    runBotProbes(canonical, fetchFn).catch((e) => {
      warnings.push(`Bot probes failed: ${e instanceof Error ? e.message : String(e)}`);
      return {} as Record<string, BotProbeResult>;
    }),
  ]);

  // 5. Sample inner pages (depends on sitemap + homepage HTML)
  const homepageHtml = homepageStatic?.ok ? homepageStatic.html : "";
  const { pages: sampledPages, warnings: samplerWarnings } = sampleInnerPages(
    canonical,
    sitemap.entries,
    homepageHtml
  );
  warnings.push(...samplerWarnings);

  // 6. Fetch inner pages in parallel
  const innerPageResults = await Promise.all(
    sampledPages.map(async ({ url }) => {
      const staticResult = await fetchStatic(url, fetchFn).catch((e) => {
        warnings.push(`Inner page fetch failed for ${url}: ${e instanceof Error ? e.message : String(e)}`);
        return null;
      });

      const result: StaticFetchResult = staticResult ?? {
        ok: false,
        kind: "network",
        status: null,
        message: "Fetch failed",
        redirectChain: [],
        fetchedAt: new Date(),
      };

      const { jsonLd, meta, semantic } = parseHtml(url, result, origin);
      return { url, static: result, jsonLd, meta, semantic } satisfies PageAnalysis;
    })
  );

  return {
    input: { raw, canonical, urlHash },
    fetchedAt,
    robots,
    sitemap,
    llmsTxt,
    homepage,
    innerPages: innerPageResults,
    botProbes: botProbesResult,
    pagespeed,
    wikidataResult,
    warnings,
    errors,
  };
}

function buildEmptyPage(url: string): PageAnalysis {
  return {
    url,
    static: {
      ok: false,
      kind: "network",
      status: null,
      message: "Not fetched",
      redirectChain: [],
      fetchedAt: new Date(),
    },
    jsonLd: { blocks: [], allTypes: [], organization: null, hasType: () => false, errors: [] },
    meta: {
      canonical: null, description: null, keywords: null, robots: null, viewport: null,
      og: {}, twitter: {}, hreflang: [],
      xRobotsTag: null, contentType: null, strictTransportSecurity: null,
    },
    semantic: {
      headings: [],
      landmarks: { main: 0, article: 0, section: 0, nav: 0, header: 0, footer: 0, aside: 0 },
      images: { total: 0, withAlt: 0, decorativeEmptyAlt: 0 },
      internalLinks: 0,
      externalLinks: 0,
      wordCount: 0,
    },
  };
}
