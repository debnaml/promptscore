/**
 * Sprint 3 scoring tests — runner, checks, aggregate
 */
import { describe, it, expect } from "vitest";
import { runChecks } from "./runner";
import { aggregate, CATEGORY_WEIGHTS } from "./aggregate";
import { ALL_CHECKS } from "./registry";
import { scored, notScored } from "./types";
import type { FetchContext } from "@promptscore/fetch";

// ---------------------------------------------------------------------------
// Minimal FetchContext factory
// ---------------------------------------------------------------------------

function makeLandmarks(overrides?: Partial<ReturnType<typeof defaultLandmarks>>) {
  return { ...defaultLandmarks(), ...overrides };
}

function defaultLandmarks() {
  return { header: 1, nav: 1, main: 1, footer: 1, aside: 0, article: 1, section: 2 };
}

function makeSemanticAnalysis(overrides?: object) {
  return {
    headings: [{ level: 1, text: "Home" }, { level: 2, text: "Features" }],
    landmarks: makeLandmarks(),
    images: { total: 4, withAlt: 4, withoutAlt: 0 },
    internalLinks: 10,
    externalLinks: 3,
    wordCount: 600,
    ...overrides,
  };
}

function makeJsonLd(overrides?: object) {
  return {
    blocks: [],
    allTypes: [],
    organization: null,
    hasType: () => false,
    errors: [],
    ...overrides,
  };
}

function makeMeta(overrides?: object) {
  return {
    canonical: "https://example.com",
    description: "A test site",
    keywords: null,
    robots: null,
    viewport: "width=device-width",
    og: { title: "Test", type: "website", url: "https://example.com", image: null, description: null },
    twitter: { card: "summary", site: null, creator: null, title: null, description: null, image: null },
    hreflang: [],
    xRobotsTag: null,
    contentType: "text/html",
    strictTransportSecurity: "max-age=31536000",
    ...overrides,
  };
}

function makeStaticOk(html = "<html><head></head><body><main><h1>Test</h1></body></html>") {
  return {
    ok: true as const,
    html,
    status: 200,
    redirectChain: [],
    headers: {},
    fetchedAt: new Date(),
  };
}

function makeStaticError() {
  return {
    ok: false as const,
    kind: "dns" as const,
    status: null,
    message: "DNS error",
    redirectChain: [],
    fetchedAt: new Date(),
  };
}

function makePage(overrides?: {
  url?: string;
  html?: string;
  jsonLd?: object;
  meta?: object;
  semantic?: object;
}) {
  const html = overrides?.html ?? "<html><head></head><body><main><h1>Test</h1></body></html>";
  return {
    url: overrides?.url ?? "https://example.com",
    static: makeStaticOk(html),
    jsonLd: makeJsonLd(overrides?.jsonLd),
    meta: makeMeta(overrides?.meta),
    semantic: makeSemanticAnalysis(overrides?.semantic),
  };
}

function makeRobots(overrides?: {
  allowAll?: boolean;
  sitemapUrls?: string[];
  explicitBots?: string[];
  disallowedBots?: string[];
}) {
  const allowedBots = new Set<string>(["*"]);
  const explicitBots = new Set<string>(overrides?.explicitBots ?? []);
  const disallowedBots = new Set<string>(overrides?.disallowedBots ?? []);

  return {
    isAllowed: (bot: string, _path: string) => !disallowedBots.has(bot),
    hasExplicitRuleFor: (bot: string) => explicitBots.has(bot),
    sitemapUrls: () => overrides?.sitemapUrls ?? ["https://example.com/sitemap.xml"],
    listedUserAgents: () => Array.from(allowedBots),
    raw: "User-agent: *\nAllow: /",
    present: true,
    status: 200,
  };
}

function makeCtx(overrides?: {
  canonical?: string;
  robots?: ReturnType<typeof makeRobots>;
  sitemap?: { present: boolean; entries: unknown[] };
  llmsTxt?: { present: boolean; valid: boolean; raw: string | null; fullRaw: string | null; errors: string[] };
  homepage?: ReturnType<typeof makePage>;
  innerPages?: ReturnType<typeof makePage>[];
  botProbes?: Record<string, { userAgent: string; status: number; blocked: boolean; cloudflareChallenge: boolean }>;
}): FetchContext {
  return {
    input: { raw: "https://example.com", canonical: overrides?.canonical ?? "https://example.com", urlHash: "abc" },
    fetchedAt: new Date(),
    robots: (overrides?.robots ?? makeRobots()) as unknown as FetchContext["robots"],
    sitemap: (overrides?.sitemap ?? { present: true, entries: Array.from({ length: 10 }, (_, i) => ({ url: `https://example.com/page-${i}`, priority: null, lastmod: null, changefreq: null })), sourceUrl: "https://example.com/sitemap.xml", errors: [] }) as FetchContext["sitemap"],
    llmsTxt: overrides?.llmsTxt ?? { present: true, valid: true, raw: "# Test Site\n", fullRaw: "# Test Site\nFull content", errors: [] },
    homepage: overrides?.homepage ?? makePage(),
    innerPages: overrides?.innerPages ?? [],
    botProbes: overrides?.botProbes ?? {},
    warnings: [],
    errors: [],
  } as unknown as FetchContext;
}

// ---------------------------------------------------------------------------
// types.ts
// ---------------------------------------------------------------------------
describe("scored / notScored helpers", () => {
  it("scored builds a passing result", () => {
    const r = scored(1, { foo: "bar" });
    expect(r.score).toBe(1);
    expect(r.not_scored).toBe(false);
    expect(r.evidence).toEqual({ foo: "bar" });
  });

  it("notScored builds a not-scored result", () => {
    const r = notScored("reason");
    expect(r.score).toBe(-1);
    expect(r.not_scored).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// runner.ts
// ---------------------------------------------------------------------------
describe("runChecks", () => {
  it("runs D checks and skips A checks", async () => {
    const checks = [
      { key: "d_check", category: "crawler_access" as const, type: "D" as const, weight: 2, run: () => scored(1, {}) },
      { key: "a_check", category: "content_clarity" as const, type: "A" as const, weight: 5, run: () => scored(0.5, {}) },
    ];
    const ctx = makeCtx();
    const results = await runChecks(ctx as FetchContext, checks);
    expect(results.map((r) => r.key)).toContain("d_check");
    expect(results.map((r) => r.key)).not.toContain("a_check");
  });

  it("catches thrown errors and marks not_scored", async () => {
    const checks = [
      { key: "bad_check", category: "crawler_access" as const, type: "D" as const, weight: 2, run: () => { throw new Error("Oops"); } },
    ];
    const ctx = makeCtx();
    const results = await runChecks(ctx as FetchContext, checks);
    expect(results[0].result.not_scored).toBe(true);
    expect(results[0].result.notes).toContain("Oops");
  });
});

// ---------------------------------------------------------------------------
// crawler-access checks
// ---------------------------------------------------------------------------
import { crawlerAccessChecks } from "./categories/crawler-access";

describe("crawler_access checks", () => {
  describe("robots_valid", () => {
    const check = crawlerAccessChecks.find((c) => c.key === "robots_valid")!;

    it("scores 1 when robots present", () => {
      const ctx = makeCtx({ robots: makeRobots() });
      const r = check.run(ctx as FetchContext);
      if (r instanceof Promise) return r.then((res) => expect(res.score).toBe(1));
      expect(r.score).toBe(1);
    });
  });

  describe("retrieval_bots_allowed", () => {
    const check = crawlerAccessChecks.find((c) => c.key === "retrieval_bots_allowed")!;

    it("scores 1 when all retrieval bots allowed", () => {
      const ctx = makeCtx({ robots: makeRobots() });
      const r = check.run(ctx as FetchContext) as ReturnType<typeof scored>;
      expect(r.score).toBe(1);
    });

    it("scores 0 when all retrieval bots disallowed", () => {
      const ctx = makeCtx({
        robots: makeRobots({ disallowedBots: ["OAI-SearchBot", "ChatGPT-User", "PerplexityBot", "Perplexity-User", "Claude-SearchBot"] }),
      });
      const r = check.run(ctx as FetchContext) as ReturnType<typeof scored>;
      expect(r.score).toBe(0);
    });

    it("scores 0.5 when some blocked", () => {
      const ctx = makeCtx({ robots: makeRobots({ disallowedBots: ["GPTBot", "OAI-SearchBot"] }) });
      const r = check.run(ctx as FetchContext) as ReturnType<typeof scored>;
      expect(r.score).toBe(0.5);
    });
  });

  describe("training_bots_explicit", () => {
    const check = crawlerAccessChecks.find((c) => c.key === "training_bots_explicit")!;

    it("scores 1 when all training bots have explicit rules", () => {
      const ctx = makeCtx({
        robots: makeRobots({ explicitBots: ["GPTBot", "ClaudeBot", "Google-Extended", "CCBot"] }),
      });
      const r = check.run(ctx as FetchContext) as ReturnType<typeof scored>;
      expect(r.score).toBe(1);
    });

    it("scores 0 when no training bots mentioned", () => {
      const ctx = makeCtx({ robots: makeRobots({ explicitBots: [] }) });
      const r = check.run(ctx as FetchContext) as ReturnType<typeof scored>;
      expect(r.score).toBe(0);
    });
  });

  describe("sitemap_present_linked", () => {
    const check = crawlerAccessChecks.find((c) => c.key === "sitemap_present_linked")!;

    it("scores 1 when sitemap present and linked in robots", () => {
      const ctx = makeCtx();
      const r = check.run(ctx as FetchContext) as ReturnType<typeof scored>;
      expect(r.score).toBe(1);
    });

    it("scores 0 when sitemap absent", () => {
      const ctx = makeCtx({ sitemap: { present: false, entries: [] } });
      const r = check.run(ctx as FetchContext) as ReturnType<typeof scored>;
      expect(r.score).toBe(0);
    });
  });

  describe("https_hsts", () => {
    const check = crawlerAccessChecks.find((c) => c.key === "https_hsts")!;

    it("scores 1 for https with HSTS", () => {
      const ctx = makeCtx({ canonical: "https://example.com" });
      const r = check.run(ctx as FetchContext) as ReturnType<typeof scored>;
      expect(r.score).toBe(1);
    });

    it("scores 0 for http", () => {
      const ctx = makeCtx({ canonical: "http://example.com" });
      const r = check.run(ctx as FetchContext) as ReturnType<typeof scored>;
      expect(r.score).toBe(0);
    });

    it("scores 0.5 for https without HSTS", () => {
      const ctx = makeCtx({
        canonical: "https://example.com",
        homepage: makePage({ meta: { strictTransportSecurity: null } }),
      });
      const r = check.run(ctx as FetchContext) as ReturnType<typeof scored>;
      expect(r.score).toBe(0.5);
    });
  });

  describe("js_dependency_ratio", () => {
    const check = crawlerAccessChecks.find((c) => c.key === "js_dependency_ratio")!;

    it("returns not_scored (Playwright deferred)", () => {
      const ctx = makeCtx();
      const r = check.run(ctx as FetchContext) as ReturnType<typeof notScored>;
      expect(r.not_scored).toBe(true);
    });
  });
});

// ---------------------------------------------------------------------------
// structured-data checks
// ---------------------------------------------------------------------------
import { structuredDataChecks } from "./categories/structured-data";

describe("structured_data checks", () => {
  describe("schema_organization", () => {
    const check = structuredDataChecks.find((c) => c.key === "schema_organization")!;

    it("scores 1 when Organization schema present with all fields", () => {
      const ctx = makeCtx({
        homepage: makePage({
          jsonLd: {
            ...makeJsonLd(),
            organization: {
              name: "Test Co",
              url: "https://example.com",
              logo: "https://example.com/logo.png",
              sameAs: ["https://twitter.com/test"],
            },
          },
        }),
      });
      const r = check.run(ctx as FetchContext) as ReturnType<typeof scored>;
      expect(r.score).toBe(1);
    });

    it("scores 0.5 when Organization present with only name+url", () => {
      const ctx = makeCtx({
        homepage: makePage({
          jsonLd: {
            ...makeJsonLd(),
            organization: { name: "Test Co", url: "https://example.com", sameAs: [] },
          },
        }),
      });
      const r = check.run(ctx as FetchContext) as ReturnType<typeof scored>;
      expect(r.score).toBe(0.5);
    });

    it("scores 0 when no Organization", () => {
      const ctx = makeCtx({ homepage: makePage({ jsonLd: makeJsonLd() }) });
      const r = check.run(ctx as FetchContext) as ReturnType<typeof scored>;
      expect(r.score).toBe(0);
    });
  });

  describe("og_tags_complete", () => {
    const check = structuredDataChecks.find((c) => c.key === "og_tags_complete")!;

    it("scores 1 when all OG tags present", () => {
      const ctx = makeCtx({
        homepage: makePage({
          meta: {
            og: { title: "Test", type: "website", url: "https://example.com", image: "https://example.com/img.png", description: "Desc" },
          },
        }),
      });
      const r = check.run(ctx as FetchContext) as ReturnType<typeof scored>;
      expect(r.score).toBe(1);
    });

    it("scores 0 when no OG tags", () => {
      const ctx = makeCtx({
        homepage: makePage({ meta: { og: { title: null, type: null, url: null, image: null, description: null } } }),
      });
      const r = check.run(ctx as FetchContext) as ReturnType<typeof scored>;
      expect(r.score).toBe(0);
    });
  });

  describe("canonical_urls", () => {
    const check = structuredDataChecks.find((c) => c.key === "canonical_urls")!;

    it("scores 1 when homepage has canonical", () => {
      const ctx = makeCtx({ homepage: makePage({ meta: { canonical: "https://example.com" } }) });
      const r = check.run(ctx as FetchContext) as ReturnType<typeof scored>;
      expect(r.score).toBe(1);
    });
  });
});

// ---------------------------------------------------------------------------
// content-clarity checks
// ---------------------------------------------------------------------------
import { contentClarityChecks } from "./categories/content-clarity";

describe("content_clarity checks", () => {
  describe("heading_hierarchy", () => {
    const check = contentClarityChecks.find((c) => c.key === "heading_hierarchy")!;

    it("scores 1 for well-structured headings", () => {
      const ctx = makeCtx({
        homepage: makePage({
          semantic: makeSemanticAnalysis({ headings: [{ level: 1, text: "Home" }, { level: 2, text: "Section" }] }),
        }),
      });
      const r = check.run(ctx as FetchContext) as ReturnType<typeof scored>;
      expect(r.score).toBe(1);
    });

    it("scores lower when H1 missing", () => {
      const ctx = makeCtx({
        homepage: makePage({
          semantic: makeSemanticAnalysis({ headings: [{ level: 2, text: "Section" }] }),
        }),
      });
      const r = check.run(ctx as FetchContext) as ReturnType<typeof scored>;
      expect(r.score).toBeLessThan(1);
    });
  });

  describe("alt_text_coverage", () => {
    const check = contentClarityChecks.find((c) => c.key === "alt_text_coverage")!;

    it("scores 1 when all images have alt text", () => {
      const ctx = makeCtx({
        homepage: makePage({ semantic: makeSemanticAnalysis({ images: { total: 4, withAlt: 4, withoutAlt: 0 } }) }),
      });
      const r = check.run(ctx as FetchContext) as ReturnType<typeof scored>;
      expect(r.score).toBe(1);
    });

    it("scores 1 when no images (vacuously true)", () => {
      const ctx = makeCtx({
        homepage: makePage({ semantic: makeSemanticAnalysis({ images: { total: 0, withAlt: 0, withoutAlt: 0 } }) }),
      });
      const r = check.run(ctx as FetchContext) as ReturnType<typeof scored>;
      expect(r.score).toBe(1);
    });

    it("scores 0 when almost no alt text", () => {
      const ctx = makeCtx({
        homepage: makePage({ semantic: makeSemanticAnalysis({ images: { total: 10, withAlt: 1, withoutAlt: 9 } }) }),
      });
      const r = check.run(ctx as FetchContext) as ReturnType<typeof scored>;
      expect(r.score).toBe(0);
    });
  });

  describe("homepage_clarity_rubric", () => {
    const check = contentClarityChecks.find((c) => c.key === "homepage_clarity_rubric")!;
    it("returns not_scored (AI deferred)", () => {
      const r = check.run(makeCtx() as FetchContext) as ReturnType<typeof notScored>;
      expect(r.not_scored).toBe(true);
    });
  });

  describe("faq_content_present", () => {
    const check = contentClarityChecks.find((c) => c.key === "faq_content_present")!;

    it("detects FAQ via heading text", () => {
      const ctx = makeCtx({
        homepage: makePage({
          semantic: makeSemanticAnalysis({
            headings: [{ level: 1, text: "Home" }, { level: 2, text: "FAQ" }],
          }),
          html: "<html><body><h2>FAQ</h2></body></html>",
        }),
      });
      const r = check.run(ctx as FetchContext) as ReturnType<typeof scored>;
      expect(r.score).toBe(1);
    });

    it("scores 0 when no FAQ content", () => {
      const ctx = makeCtx({
        homepage: makePage({
          html: "<html><body><h1>Home</h1><p>Welcome</p></body></html>",
          semantic: makeSemanticAnalysis({ headings: [{ level: 1, text: "Home" }] }),
        }),
      });
      const r = check.run(ctx as FetchContext) as ReturnType<typeof scored>;
      expect(r.score).toBe(0);
    });
  });

  describe("content_depth_linking", () => {
    const check = contentClarityChecks.find((c) => c.key === "content_depth_linking")!;

    it("scores 1 with deep content and good links", () => {
      const ctx = makeCtx({
        homepage: makePage({ semantic: makeSemanticAnalysis({ wordCount: 800, internalLinks: 10 }) }),
      });
      const r = check.run(ctx as FetchContext) as ReturnType<typeof scored>;
      expect(r.score).toBe(1);
    });

    it("scores 0 with thin shallow content", () => {
      const ctx = makeCtx({
        homepage: makePage({ semantic: makeSemanticAnalysis({ wordCount: 100, internalLinks: 1 }) }),
      });
      const r = check.run(ctx as FetchContext) as ReturnType<typeof scored>;
      expect(r.score).toBe(0);
    });
  });
});

// ---------------------------------------------------------------------------
// ai-specific checks
// ---------------------------------------------------------------------------
import { aiSpecificChecks } from "./categories/ai-specific";

describe("ai_specific checks", () => {
  describe("llms_txt_present", () => {
    const check = aiSpecificChecks.find((c) => c.key === "llms_txt_present")!;

    it("scores 1 when present and valid", () => {
      const ctx = makeCtx({ llmsTxt: { present: true, valid: true, raw: "# Test", fullRaw: null, errors: [] } });
      const r = check.run(ctx as FetchContext) as ReturnType<typeof scored>;
      expect(r.score).toBe(1);
    });

    it("scores 0.5 when present but invalid", () => {
      const ctx = makeCtx({ llmsTxt: { present: true, valid: false, raw: "bad", fullRaw: null, errors: ["error"] } });
      const r = check.run(ctx as FetchContext) as ReturnType<typeof scored>;
      expect(r.score).toBe(0.5);
    });

    it("scores 0 when absent", () => {
      const ctx = makeCtx({ llmsTxt: { present: false, valid: false, raw: null, fullRaw: null, errors: [] } });
      const r = check.run(ctx as FetchContext) as ReturnType<typeof scored>;
      expect(r.score).toBe(0);
    });
  });

  describe("llms_full_txt", () => {
    const check = aiSpecificChecks.find((c) => c.key === "llms_full_txt")!;

    it("scores 1 when llms-full.txt present", () => {
      const ctx = makeCtx({ llmsTxt: { present: true, valid: true, raw: "# Test", fullRaw: "# Full content", errors: [] } });
      const r = check.run(ctx as FetchContext) as ReturnType<typeof scored>;
      expect(r.score).toBe(1);
    });

    it("scores 0 when absent", () => {
      const ctx = makeCtx({ llmsTxt: { present: true, valid: true, raw: "# Test", fullRaw: null, errors: [] } });
      const r = check.run(ctx as FetchContext) as ReturnType<typeof scored>;
      expect(r.score).toBe(0);
    });
  });

  describe("retrieval_vs_training_differentiated", () => {
    const check = aiSpecificChecks.find((c) => c.key === "retrieval_vs_training_differentiated")!;

    it("scores 1 when both retrieval and training bots explicitly addressed", () => {
      const ctx = makeCtx({
        robots: makeRobots({
          explicitBots: ["OAI-SearchBot", "Claude-SearchBot", "GPTBot", "ClaudeBot", "Google-Extended", "CCBot"],
        }),
      });
      const r = check.run(ctx as FetchContext) as ReturnType<typeof scored>;
      expect(r.score).toBe(1);
    });

    it("scores 0 when no explicit rules", () => {
      const ctx = makeCtx({ robots: makeRobots({ explicitBots: [] }) });
      const r = check.run(ctx as FetchContext) as ReturnType<typeof scored>;
      expect(r.score).toBe(0);
    });
  });

  describe("waf_not_blocking_ai_bots", () => {
    const check = aiSpecificChecks.find((c) => c.key === "waf_not_blocking_ai_bots")!;

    it("returns not_scored when botProbes empty", () => {
      const ctx = makeCtx({ botProbes: {} });
      const r = check.run(ctx as FetchContext) as ReturnType<typeof notScored>;
      expect(r.not_scored).toBe(true);
    });

    it("scores 1 when no retrieval bots blocked", () => {
      const ctx = makeCtx({
        botProbes: {
          "OAI-SearchBot": { userAgent: "ua", status: 200, blocked: false, cloudflareChallenge: false },
          "Claude-SearchBot": { userAgent: "ua", status: 200, blocked: false, cloudflareChallenge: false },
        },
      });
      const r = check.run(ctx as FetchContext) as ReturnType<typeof scored>;
      expect(r.score).toBe(1);
    });
  });

  describe("tdm_headers", () => {
    const check = aiSpecificChecks.find((c) => c.key === "tdm_headers")!;

    it("scores 1 when noai in x-robots-tag", () => {
      const ctx = makeCtx({
        homepage: makePage({ meta: { xRobotsTag: "noai, noimageai" } }),
      });
      const r = check.run(ctx as FetchContext) as ReturnType<typeof scored>;
      expect(r.score).toBe(1);
    });

    it("scores 0 when no TDM signals", () => {
      const ctx = makeCtx({ homepage: makePage({ meta: { xRobotsTag: null } }) });
      const r = check.run(ctx as FetchContext) as ReturnType<typeof scored>;
      expect(r.score).toBe(0);
    });
  });
});

// ---------------------------------------------------------------------------
// authority-trust checks
// ---------------------------------------------------------------------------
import { authorityTrustChecks } from "./categories/authority-trust";

describe("authority_trust checks", () => {
  describe("about_page_substantive", () => {
    const check = authorityTrustChecks.find((c) => c.key === "about_page_substantive")!;

    it("scores 1 when about page has 300+ words", () => {
      const ctx = makeCtx({
        innerPages: [makePage({ url: "https://example.com/about", semantic: makeSemanticAnalysis({ wordCount: 400 }) })],
      });
      const r = check.run(ctx as FetchContext) as ReturnType<typeof scored>;
      expect(r.score).toBe(1);
    });

    it("scores 0 when no about page found", () => {
      const ctx = makeCtx({ innerPages: [makePage({ url: "https://example.com/blog" })] });
      const r = check.run(ctx as FetchContext) as ReturnType<typeof scored>;
      expect(r.score).toBe(0);
    });
  });

  describe("contact_info_complete", () => {
    const check = authorityTrustChecks.find((c) => c.key === "contact_info_complete")!;

    it("scores 1 when all contact info present", () => {
      const ctx = makeCtx({
        homepage: makePage({
          html: `<html><body>
            <a href="tel:+441234567890">Call us</a>
            <a href="mailto:info@example.com">Email</a>
            <address>123 Street</address>
          </body></html>`,
        }),
      });
      const r = check.run(ctx as FetchContext) as ReturnType<typeof scored>;
      expect(r.score).toBe(1);
    });

    it("scores 0 when no contact info", () => {
      const ctx = makeCtx({ homepage: makePage({ html: "<html><body><p>Hello</p></body></html>" }) });
      const r = check.run(ctx as FetchContext) as ReturnType<typeof scored>;
      expect(r.score).toBe(0);
    });
  });

  describe("sameas_links", () => {
    const check = authorityTrustChecks.find((c) => c.key === "sameas_links")!;

    it("scores 1 with 3+ sameAs links", () => {
      const ctx = makeCtx({
        homepage: makePage({
          jsonLd: {
            ...makeJsonLd(),
            organization: { name: "Test Co", url: "https://example.com", sameAs: ["https://twitter.com/test", "https://linkedin.com/test", "https://facebook.com/test"] },
          },
        }),
      });
      const r = check.run(ctx as FetchContext) as ReturnType<typeof scored>;
      expect(r.score).toBe(1);
    });

    it("scores 0 when no sameAs", () => {
      const ctx = makeCtx({
        homepage: makePage({ jsonLd: makeJsonLd() }),
      });
      const r = check.run(ctx as FetchContext) as ReturnType<typeof scored>;
      expect(r.score).toBe(0);
    });
  });

  describe("wikidata_presence", () => {
    const check = authorityTrustChecks.find((c) => c.key === "wikidata_presence")!;

    it("returns not_scored when no wikidata result", () => {
      const ctx = makeCtx();
      const r = check.run(ctx as FetchContext) as ReturnType<typeof notScored>;
      expect(r.not_scored).toBe(true);
    });
  });

  describe("citation_practice", () => {
    const check = authorityTrustChecks.find((c) => c.key === "citation_practice")!;
    it("returns not_scored (AI check)", () => {
      const r = check.run(makeCtx() as FetchContext);
      expect((r as ReturnType<typeof notScored>).not_scored).toBe(true);
    });
  });
});

// ---------------------------------------------------------------------------
// aggregate.ts
// ---------------------------------------------------------------------------
describe("aggregate", () => {
  it("computes category and overall scores", () => {
    const results = [
      { key: "robots_valid", category: "crawler_access", type: "D", weight: 2, result: scored(1, {}) },
      { key: "retrieval_bots_allowed", category: "crawler_access", type: "D", weight: 5, result: scored(1, {}) },
    ];
    const agg = aggregate(results);
    expect(agg.category_scores.crawler_access).toBe(100);
    expect(agg.overall_score).toBeGreaterThan(0);
  });

  it("renormalises not_scored checks out of category", () => {
    const results = [
      { key: "retrieval_bots_allowed", category: "crawler_access", type: "D", weight: 5, result: scored(1, {}) },
      { key: "js_dependency_ratio", category: "crawler_access", type: "DC", weight: 5, result: notScored("deferred") },
    ];
    const agg = aggregate(results);
    // Only retrieval_bots_allowed contributes — weight 5 of weight 5 = 100%
    expect(agg.category_scores.crawler_access).toBe(100);
    expect(agg.not_scored_count).toBe(1);
  });

  it("produces priority_actions from failing checks", () => {
    const results = [
      { key: "wikidata_presence", category: "authority_trust", type: "D", weight: 3, result: scored(0, {}) },
      { key: "robots_valid", category: "crawler_access", type: "D", weight: 2, result: scored(0, {}) },
    ];
    const agg = aggregate(results);
    expect(agg.priority_actions.length).toBeGreaterThan(0);
    expect(agg.negatives.length).toBe(2);
  });

  it("exports CATEGORY_WEIGHTS summing to 100", () => {
    const total = Object.values(CATEGORY_WEIGHTS).reduce((a, b) => a + b, 0);
    expect(total).toBe(100);
  });
});

// ---------------------------------------------------------------------------
// registry — ALL_CHECKS completeness
// ---------------------------------------------------------------------------
describe("ALL_CHECKS registry", () => {
  it("has unique keys", () => {
    const keys = ALL_CHECKS.map((c) => c.key);
    const unique = new Set(keys);
    expect(unique.size).toBe(keys.length);
  });

  it("every check has valid category", () => {
    const valid = ["crawler_access", "structured_data", "content_clarity", "ai_specific", "authority_trust"];
    for (const c of ALL_CHECKS) {
      expect(valid).toContain(c.category);
    }
  });

  it("every check has valid type", () => {
    for (const c of ALL_CHECKS) {
      expect(["D", "DC", "A"]).toContain(c.type);
    }
  });

  it("every check has positive weight", () => {
    for (const c of ALL_CHECKS) {
      expect(c.weight).toBeGreaterThan(0);
    }
  });

  it("has checks in all 5 categories", () => {
    const cats = new Set(ALL_CHECKS.map((c) => c.category));
    expect(cats.size).toBe(5);
  });

  it("run() never throws for a minimal ctx", async () => {
    const ctx = makeCtx() as FetchContext;
    for (const check of ALL_CHECKS) {
      const result = await check.run(ctx);
      expect(result.score).toBeGreaterThanOrEqual(-1);
    }
  });
});
