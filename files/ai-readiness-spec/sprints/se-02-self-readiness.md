# SE2 — Self-SEO + AI search readiness

**Goal**: Make `promptscore.vercel.app` itself a top-scoring site on its own scanner. The strongest sales asset is a screenshot of the tool grading itself ≥95.

**Deliverable**: Robots, sitemap, llms.txt, structured data, per-page metadata, and an OG image for every public route. Promptscore scans itself and scores ≥95.

**Branch**: `se-02-self-readiness`
**Tag on completion**: `v0.7.2`

---

## Tasks

### SE2.1 — robots.txt + sitemap.xml + llms.txt

- `/robots.txt` — explicitly allow major retrieval bots (GPTBot, ClaudeBot, PerplexityBot, OAI-SearchBot, ChatGPT-User, Googlebot, Bingbot). Block none. Reference sitemap.
- `/sitemap.xml` — generated from a static list of public routes (homepage, methodology, privacy, blog index, individual blog posts). Updated automatically when blog posts are added (post-SE6).
- `/llms.txt` — plain-text guide to AI agents about what the site is, how to use it, and where the canonical content lives. Treat the file itself as a marketing asset.

### SE2.2 — Per-page metadata via Next.js `metadata` API

Every public route exports a `Metadata` object with:

- `title` (page-specific, ends with " — PromptScore")
- `description` (page-specific, 140–160 chars)
- `canonical` URL
- `openGraph` — title, description, url, image (from SE1.6)
- `twitter` — summary_large_image card

Routes covered: `/`, `/methodology`, `/privacy`, `/scan/[id]`, `/scan/[id]/report`, `/scan/[id]/unlock`, `/unsubscribe`.

### SE2.3 — Structured data (JSON-LD)

- Homepage: `Organization` + `WebApplication` + `WebSite` (with `SearchAction` pointing to the scan form)
- Methodology page: `FAQPage` (post-SE3)
- Blog posts (post-SE6): `Article` + `BreadcrumbList`
- Per-scan public result: `Report` schema (custom but valid) + `BreadcrumbList`

### SE2.4 — Verify SSR + content rendering

- All public pages confirmed to render meaningful content **without** JavaScript (curl + view-source check)
- No content gated behind hydration
- Word count above the fold ≥150 on homepage, ≥600 on methodology

### SE2.5 — Crawler-friendly result pages

The public scan result page (`/scan/[id]`) should be:

- Server-rendered with all content visible
- Indexable (no `noindex`)
- Canonical URL set to the result page itself
- Has a clear `<h1>` like "AI readiness score for {url}: {score}/100"

This makes individual results AI-citable and SEO-indexable — every scan becomes a piece of content.

### SE2.6 — Self-scan + remediate

1. Run the scanner against `https://promptscore.vercel.app` (or final domain).
2. Review all 34 check results.
3. Fix any check scoring < 1 (full marks). For each, document why and the fix.
4. Re-scan, confirm overall score ≥ 95.
5. Take screenshot — saved to `docs/self-scan-screenshot.png` for use in marketing materials.

### SE2.7 — Domain decision + canonical

Decide between `promptscore.vercel.app` (current), `promptscore.co.uk` (planned in spec), or another. Set canonical URLs accordingly. If switching, configure 301 redirect from old domain.

---

## Acceptance tests

- [ ] `curl https://{domain}/robots.txt` returns a valid robots file with allow rules for the major AI bots and a sitemap reference.
- [ ] `curl https://{domain}/sitemap.xml` returns a valid sitemap with all public routes.
- [ ] `curl https://{domain}/llms.txt` returns a meaningful AI-agent description.
- [ ] Every public route, viewed in a browser's "view source", shows a complete `<title>`, `<meta description>`, canonical, and OG tags.
- [ ] Schema.org markup validates against the [Schema Markup Validator](https://validator.schema.org/) for the homepage.
- [ ] Running the public scanner against the production domain returns an overall score ≥ 95.
- [ ] Sharing the homepage URL in LinkedIn/Slack/Twitter shows the new OG image preview correctly.

---

## Out of scope

- Final domain migration to a custom .co.uk if not already done — SE2.7 just requires a decision.
- Localisation / multi-language metadata — defer.
