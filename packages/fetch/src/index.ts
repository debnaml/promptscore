// @promptscore/fetch — FetchContext builder
export { canonicalise } from "./canonicalise";
export type { CanonicaliseOptions, CanonicaliseResult } from "./canonicalise";

export { fetchRobots, RobotsAnalysis } from "./robots";
export type { RobotsResult } from "./robots";

export { fetchSitemap } from "./sitemap";
export type { SitemapEntry, SitemapAnalysis, SitemapResult } from "./sitemap";

export { fetchLlmsTxt, validateLlmsTxt } from "./llms-txt";
export type { LlmsTxtAnalysis, LlmsTxtResult } from "./llms-txt";

export { fetchStatic } from "./static-fetch";
export type { StaticFetchResult, StaticFetchSuccess, StaticFetchError } from "./static-fetch";

export { sampleInnerPages } from "./inner-page-sampler";
export type { SampledPage, InnerPageSample } from "./inner-page-sampler";

export { extractJsonLd } from "./jsonld";
export type { JsonLdBlock, JsonLdAnalysis, OrganizationSchema } from "./jsonld";

export { extractMeta } from "./meta";
export type { MetaAnalysis, HreflangAlternate } from "./meta";

export { extractSemantic } from "./semantic";
export type { SemanticAnalysis, HeadingEntry, LandmarkCounts, ImageAltCoverage } from "./semantic";

export { buildFetchContext } from "./fetch-context";
export type { FetchContext, PageAnalysis } from "./fetch-context";

export { fetchPageSpeed } from "./pagespeed";
export type { PageSpeedResult } from "./pagespeed";

export { lookupWikidata } from "./wikidata";
export type { WikidataResult } from "./wikidata";

export { runBotProbes, AI_BOT_USER_AGENTS } from "./bot-probes";
export type { BotProbeResult, BotName } from "./bot-probes";
