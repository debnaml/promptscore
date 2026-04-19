# Sprint 2 — Deterministic fetch & parse layer

**Goal**: Build the fetching and parsing engine that powers all deterministic checks. No scoring yet.

**Deliverable**: A `FetchContext` object populated for any URL, containing `robots.txt`, `sitemap.xml`, `llms.txt`, homepage HTML (static and rendered), 3 sampled inner pages, parsed JSON-LD, meta tags, headings, and semantic landmark counts.

**Branch**: `sprint-02-fetch-parse`
**Tag on completion**: `v0.2.0`

---

## Tasks

### S2.1 — URL canonicaliser
In `packages/fetch/src/canonicalise.ts`, write a pure function:
- Adds `https://` if missing
- Strips fragment
- Lowercases host
- Removes default ports (80, 443)
- Normalises trailing slash (retain for path, remove for host-only)
- Optionally strips `www.` based on config flag
- Returns `{ canonical: string, urlHash: string (sha256) }`

Write 20+ unit tests covering edge cases: unicode hosts, IDNs, ports, mixed case, multiple slashes, trailing fragments, query param ordering (for cache key — should be deterministic).

### S2.2 — robots.txt fetcher + parser
Use `robots-parser` npm package. Fetch `{host}/robots.txt` with 5s timeout. Expose:

```ts
class RobotsAnalysis {
  isAllowed(userAgent: string, path: string): boolean;
  listedUserAgents(): string[];  // every user-agent block found
  hasExplicitRuleFor(userAgent: string): boolean;
  sitemapUrls(): string[];
  raw: string;
}
```

If robots.txt is missing, return an `RobotsAnalysis` where everything is allowed and `listedUserAgents()` is `[]`.

### S2.3 — sitemap.xml fetcher
Parse standard sitemaps and sitemap-index formats. Return up to 1000 URLs with `{ loc, lastmod }`. Fall back to `/sitemap.xml`, `/sitemap_index.xml`, `/sitemap-index.xml` in that order. Cap traversal depth at 2 levels for sitemap indexes.

### S2.4 — llms.txt fetcher
Fetch `/llms.txt` and (if present) `/llms-full.txt`. Validate against the minimal format from llmstxt.org: must start with `# ` header line; sections delimited by `##`. Expose:

```ts
interface LlmsTxtAnalysis {
  present: boolean;
  valid: boolean;
  raw: string | null;
  errors: string[];
}
```

### S2.5 — Static HTML fetcher
`fetchStatic(url: string)` returns `{ html, status, redirectChain, headers, fetchedAt }`. Timeout 10s. Follow up to 3 redirects. User agent: `PromptScoreBot/1.0 (+https://promptscore.co.uk/about)`.

Handle: 4xx/5xx, DNS failures, TLS errors, timeouts — each returns a typed error object, never throws.

### S2.6 — Playwright render worker
Stand up a minimal Node service on Fly.io (or Railway) with Playwright + Chromium. Single endpoint:

```
POST /render
Body: { url: string, waitUntil?: "domcontentloaded" | "networkidle" }
Returns: { html: string, performance: { ttfb, fcp, lcp }, status }
```

Timeout 25s. Auth via shared secret header `x-render-secret`. Health check at `/healthz`. Deploy config committed to repo (`apps/render-worker/fly.toml` or `railway.json`).

### S2.7 — Inner-page sampler
Given a sitemap + homepage HTML, pick 3 URLs representing diverse content types. Heuristic:
1. Prefer URLs from sitemap `<lastmod>` in the last 12 months.
2. Pick 3 distinct path depths/prefixes (e.g. `/blog/*`, `/about`, `/services/*`).
3. If sitemap is sparse or missing, fall back to extracting `<a>` hrefs from the homepage `<nav>` and `<main>`.

Return exactly 3 URLs, or fewer with an explicit warning recorded in `FetchContext.warnings`.

### S2.8 — JSON-LD extractor + validator
Parse all `<script type="application/ld+json">` blocks. Handle `@graph` arrays, multiple scripts, and malformed JSON gracefully (malformed blocks recorded in `errors`, don't abort). Expose:

```ts
interface JsonLdAnalysis {
  blocks: Array<{ raw: string; parsed: unknown; types: string[] }>;
  allTypes: Set<string>;
  organization: OrganizationSchema | null;
  hasType(type: string): boolean;
  errors: string[];
}
```

### S2.9 — Meta tag extractor
Extract from `<head>`:
- `canonical` (rel=canonical)
- `description`, `keywords`, `robots`, `viewport`
- All `og:*` properties
- All `twitter:*` properties
- `hreflang` alternates
- Response headers of interest: `x-robots-tag`, `content-type`, `strict-transport-security`

Expose as a typed `MetaAnalysis` object.

### S2.10 — Heading & semantic landmark extractor
Parse homepage + sampled inner pages. Return per-page:
- Heading tree: array of `{ level, text, order }`
- Landmark counts: `main`, `article`, `section`, `nav`, `header`, `footer`, `aside`
- Image alt coverage: `{ total: number, withAlt: number, decorativeEmptyAlt: number }`
- Internal link count + external link count
- Main-content word count (extract with Readability.js or equivalent)

### S2.11 — FetchContext assembler
Compose everything above into a single `FetchContext`:

```ts
interface FetchContext {
  input: { raw: string; canonical: string; urlHash: string };
  fetchedAt: Date;
  robots: RobotsAnalysis;
  sitemap: SitemapAnalysis;
  llmsTxt: LlmsTxtAnalysis;
  homepage: { static: StaticFetch; rendered: RenderedFetch; jsonLd: JsonLdAnalysis; meta: MetaAnalysis; structure: StructureAnalysis };
  innerPages: Array<{ url: string; static: StaticFetch; jsonLd: JsonLdAnalysis; meta: MetaAnalysis; structure: StructureAnalysis }>;
  botProbes: Record<string, { userAgent: string; status: number; blocked: boolean }>;  // populated in sprint 3
  warnings: string[];
  errors: string[];
}
```

Orchestrator runs fetches in parallel where safe, sequential where dependent (sitemap → sampler → inner pages).

---

## Acceptance tests

Frozen fixtures: save `.html` snapshots of 5 real sites in `fixtures/sites/` at the start of the sprint. All deterministic tests run against these fixtures to keep CI hermetic.

- [ ] Canonicaliser unit tests: 20+ cases, 100% pass.
- [ ] `buildFetchContext("https://performancepeak.co.uk")` completes in <20s locally and returns a populated object with no errors.
- [ ] Running against `https://birketts.co.uk` succeeds (Cloudflare-fronted site).
- [ ] Running against a deliberately broken URL (`https://nonexistent-zzzzz-site.com`) returns a context with the DNS error captured in `errors`, no unhandled exception.
- [ ] Running against a JS-heavy site (e.g. an Elementor demo) shows `rendered.html.length > static.html.length * 1.5` confirming Playwright is adding value.
- [ ] JSON-LD extractor finds all blocks on a Google Rich Results test page fixture.
- [ ] Robots parser correctly reports `isAllowed('GPTBot', '/')` against 3 fixture robots.txt files with known configurations (allow-all, block-all, differentiated).
- [ ] Running the same URL twice returns byte-identical `FetchContext` (except `fetchedAt`) when network responses are mocked.
- [ ] Playwright worker responds to `/healthz` with 200 and renders a test URL end-to-end via `POST /render`.

---

## Out of scope for this sprint

- Any scoring.
- AI calls.
- PageSpeed API integration (moved to sprint 3).
- Wikidata lookups (moved to sprint 3).
- AI-bot user-agent probes (moved to sprint 3).
