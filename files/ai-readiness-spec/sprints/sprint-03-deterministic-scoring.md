# Sprint 3 — Deterministic scoring engine

**Goal**: Implement every deterministic (D) and deterministic-composite (DC) check. All weights and rubrics must match `01-scoring-model.md` exactly.

**Deliverable**: `runDeterministicChecks(ctx: FetchContext)` returns a full set of scored checks across all five categories with no AI calls.

**Branch**: `sprint-03-deterministic-scoring`
**Tag on completion**: `v0.3.0`

---

## Tasks

### S3.1 — Check runner framework
In `packages/scoring/src/runner.ts`, define:

```ts
export interface Check {
  key: string;
  category: 'crawler_access' | 'structured_data' | 'content_clarity' | 'ai_specific' | 'authority_trust';
  type: 'D' | 'DC' | 'A';
  weight: number;
  run(ctx: FetchContext): Promise<CheckResult> | CheckResult;
}

export interface CheckResult {
  score: number;      // 0, 0.5, or 1 for D; any [0,1] for DC/A
  evidence: unknown;  // structured data supporting the score
  notes?: string;     // human-readable one-liner
}
```

Central registry: `checks: Check[]` imported from per-category files. Runner filters by `type !== 'A'` in this sprint.

### S3.2 — Crawler access checks (7 checks, 20% weight)
Implement in `packages/scoring/src/categories/crawler-access.ts`:

1. `robots_valid` (D, 2) — from `ctx.robots`
2. `retrieval_bots_allowed` (D, 5) — check OAI-SearchBot, ChatGPT-User, PerplexityBot, Perplexity-User, Claude-SearchBot
3. `training_bots_explicit` (D, 3) — check GPTBot, ClaudeBot, Google-Extended, CCBot
4. `sitemap_present_linked` (D, 2)
5. `https_hsts` (D, 2)
6. `js_dependency_ratio` (DC, 5) — compare static vs rendered word count
7. `pagespeed_mobile` (DC, 1) — call PageSpeed Insights API (see S3.7)

Each check is a pure function of `FetchContext`. No side effects. Fully unit-tested.

### S3.3 — Structured data checks (8 checks, 25% weight)
Implement in `packages/scoring/src/categories/structured-data.ts`:

1. `schema_organization` (D, 5)
2. `schema_category_appropriate` (DC, 6) — depends on detected category (set to a fixed default for sprint 3; becomes dynamic in sprint 4)
3. `schema_faq_howto` (DC, 3)
4. `schema_breadcrumbs` (D, 2)
5. `og_tags_complete` (D, 3)
6. `twitter_card` (D, 2)
7. `schema_validates` (D, 2)
8. `canonical_urls` (D, 2)

For `schema_category_appropriate`, build a lookup:
```ts
const CATEGORY_SCHEMA_EXPECTATIONS: Record<DetectedCategory, string[]> = {
  'hospitality-luxury': ['Hotel', 'LodgingBusiness', 'Resort'],
  'hospitality-budget': ['Hotel', 'LodgingBusiness'],
  'legal': ['LegalService', 'Attorney'],
  'ecommerce': ['Product', 'Offer', 'AggregateRating'],
  'saas': ['SoftwareApplication', 'Product'],
  'editorial': ['Article', 'NewsArticle', 'BlogPosting'],
  'local-services': ['LocalBusiness', 'Service'],
  'other': []
};
```

### S3.4 — Deterministic content clarity checks (6 of 8)
Implement in `packages/scoring/src/categories/content-clarity.ts`:

1. `heading_hierarchy` (D, 3)
2. `semantic_landmarks` (D, 2)
3. `alt_text_coverage` (DC, 2)
4. `publication_dates` (DC, 2) — check schema `datePublished` / `dateModified` + `<time>` elements
5. `faq_content_present` (D, 2) — heuristic: headings matching `/^(FAQ|Frequently Asked|Questions)/i` OR `<details>` elements OR repeated `?`-ending H3/H4 pattern
6. `content_depth_linking` (DC, 2) — average word count + internal link count across sampled pages

The two AI-graded checks (`homepage_clarity_rubric`, `query_coverage_rubric`) are stubbed to return `score: null, skipped: true` and excluded from aggregation until sprint 4.

### S3.5 — AI-specific signal checks (6 checks, 15% weight)
Implement in `packages/scoring/src/categories/ai-specific.ts`:

1. `llms_txt_present` (D, 3)
2. `llms_full_txt` (D, 1)
3. `retrieval_vs_training_differentiated` (D, 4) — inspect robots.txt blocks:
   - Full credit: site has distinct rules for retrieval bots (OAI-SearchBot, Claude-SearchBot) vs training bots (GPTBot, ClaudeBot)
   - Half credit: differentiates some but not all
   - No credit: treats all AI bots identically or silent
4. `waf_not_blocking_ai_bots` (DC, 4) — uses botProbes from S3.9
5. `ai_policy_page` (D, 2) — check `/ai`, `/ai-policy`, `/artificial-intelligence` paths
6. `tdm_headers` (D, 1)

### S3.6 — Deterministic authority & trust checks (6 of 7)
Implement in `packages/scoring/src/categories/authority-trust.ts`:

1. `about_page_substantive` (DC, 2) — find `/about`, `/about-us`, `/company`; check word count
2. `contact_info_complete` (D, 2) — check HTML + ContactPoint schema
3. `author_bylines` (DC, 2) — check sampled articles for author metadata
4. `wikidata_presence` (D, 3) — see S3.8
5. `sameas_links` (D, 2) — from Organization schema
6. `brand_consistency` (D, 2) — normalised string comparison across `<title>`, Organization `name`, visible logo alt, domain brand

The `citation_practice` AI check is stubbed.

### S3.7 — PageSpeed Insights integration
`packages/fetch/src/pagespeed.ts`:
- Uses Google PageSpeed Insights API (v5). API key from `PAGESPEED_API_KEY` env var.
- Mobile strategy only for v1.
- 15s timeout. Quota errors → score = null, recorded in `warnings`, check marked `not_scored` (weight renormalised).
- Results cached in Redis for 24h (separate from main scan cache — PageSpeed results are expensive and stable).

### S3.8 — Wikidata lookup
`packages/fetch/src/wikidata.ts`:
- Query the Wikidata API (`wbsearchentities`) by brand name (from Organization schema or `<title>`).
- If exact match or single strong result → score 1
- If multiple ambiguous matches → score 0.5 with notes
- If no match → score 0
- Timeout 5s; failures → `not_scored`, not a scan failure

### S3.9 — AI-bot user-agent probes
`packages/fetch/src/bot-probes.ts`:
Fetch homepage with the following user agents (in parallel, 10s timeout each):

```ts
const AI_BOT_USER_AGENTS = {
  'OAI-SearchBot': 'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; OAI-SearchBot/1.0; +https://openai.com/searchbot)',
  'ChatGPT-User': 'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; ChatGPT-User/1.0; +https://openai.com/bot)',
  'PerplexityBot': 'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; PerplexityBot/1.0; +https://perplexity.ai/perplexitybot)',
  'Claude-SearchBot': 'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; Claude-SearchBot/1.0; +https://anthropic.com/claude-searchbot)',
  'GPTBot': 'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; GPTBot/1.0; +https://openai.com/gptbot)',
  'ClaudeBot': 'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; ClaudeBot/1.0; +https://anthropic.com/claudebot)',
} as const;
```

Record `{ status, blocked: boolean, cloudflareChallenge: boolean }` for each. `blocked` is true if status >= 400 OR body matches a Cloudflare/challenge signature.

**IMPORTANT**: these user agents are being *reported* by us for a scoring tool, not used to crawl data. Do not set these user agents from user-facing Playwright sessions; use them only from the single-page probe requests here.

### S3.10 — Aggregation
`packages/scoring/src/aggregate.ts`:

```ts
export function aggregate(results: CheckResult[], registry: Check[]): ScanAggregate {
  // Group by category, renormalise weights if any check is not_scored,
  // compute category_score out of 100, compute overall_score as weighted average of categories.
  // Return { overall_score, category_scores, positives, negatives, priority_actions }
}
```

Priority actions use the effort map from `packages/scoring/src/effort-map.ts` — create this file with an entry for every check key, values: `'small' | 'medium' | 'large'`.

### S3.11 — Scan pipeline integration
Wire into the scan endpoint from sprint 1:

```
POST /api/scan
  → canonicalise & validate
  → cache lookup (urlHash + scoring version + 30 days)
  → if miss: enqueue to background worker
  → worker: buildFetchContext → runDeterministicChecks → aggregate → persist
  → client polls GET /api/scan/:id
```

Background worker: Inngest or simple Vercel cron + Supabase `status='queued'` poll. Either is fine for this sprint; choose the simpler path.

---

## Acceptance tests

- [ ] Frozen-fixture snapshot test: run the full deterministic engine on 5 committed HTML fixtures. Output JSON matches expected values exactly (failures require deliberate snapshot update).
- [ ] Every check has at least one passing and one failing unit test.
- [ ] Running the same fixture twice produces byte-identical output (except timestamps).
- [ ] Running against `https://performancepeak.co.uk` live completes in <30s and returns an overall score.
- [ ] Running against a site known to block via Cloudflare returns `waf_not_blocking_ai_bots: 0` with evidence showing which bots were blocked.
- [ ] PageSpeed API quota exhaustion → check marked `not_scored`, overall score computed with renormalised weights.
- [ ] Aggregation: category score + overall score arithmetic verified against hand-calculated test cases.
- [ ] Priority actions list has exactly 5 entries (or fewer if <5 failing checks), ranked by impact/effort.
- [ ] `scan_checks` rows persisted for every check with evidence populated.

---

## Out of scope for this sprint

- AI-graded checks (`homepage_clarity_rubric`, `query_coverage_rubric`, `citation_practice`) — sprint 4.
- Public homepage UI — sprint 4.
- Result page UI — sprint 4.
- Email gate, PDF — sprint 5.
