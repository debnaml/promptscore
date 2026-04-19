# Scoring model

Single source of truth for check weights, rubrics, and score interpretation.
Claude Code should import values from this file into code rather than redeclaring them.

---

## 1. Category weights

The overall score out of 100 is a weighted sum of five category scores:

| Category | Weight | What it measures |
|---|---|---|
| **Crawler access** | 20% | Whether AI search bots (retrieval + training) can actually reach and render your content. Covers robots.txt, sitemap, HTTPS, Cloudflare/WAF posture, JS-rendering dependency. |
| **Structured data** | 25% | Schema.org markup (JSON-LD), Open Graph, Twitter cards, and entity signals that let AI parse what the business is and what each page is about. |
| **Content clarity** | 25% | Semantic HTML, heading hierarchy, FAQ patterns, answer-ready content structure, publication dates, author attribution. Partly deterministic, partly AI-scored. |
| **AI-specific signals** | 15% | llms.txt, AI-crawler-specific directives, explicit handling of retrieval bots vs training bots, TDM reservation headers. |
| **Authority & trust** | 15% | E-E-A-T signals: author pages, about page depth, contact info, citations/sources, Wikipedia/Wikidata presence, brand consistency. |

---

## 2. Check types

Each check is one of three types:

- **D (Deterministic)** — pure parsing / HTTP check, returns the same answer every time.
- **DC (Deterministic composite)** — combines several deterministic signals into a graded score using fixed thresholds.
- **A (AI-graded)** — uses Claude at temperature 0 with a locked prompt and strict rubric. Cached by URL + content hash + prompt version.

Approximately 75% of the overall score comes from D and DC checks. AI-graded checks sit inside **Content clarity** and **Authority & trust** only.

Every check returns `{ score: 0 | 0.5 | 1, evidence, notes }` (unless a rubric explicitly uses a different scale, in which case the final value is normalised before aggregation).

---

## 3. Checks

### 3.1 Crawler access (20%)

| Check key | Type | Weight | Scoring |
|---|---|---|---|
| `robots_valid` | D | 2 | 1 = present and valid; 0.5 = present but malformed; 0 = missing |
| `retrieval_bots_allowed` | D | 5 | 1 = all of OAI-SearchBot, ChatGPT-User, PerplexityBot, Perplexity-User, Claude-SearchBot allowed or not disallowed; 0.5 = partial; 0 = all blocked |
| `training_bots_explicit` | D | 3 | 1 = explicit stance on GPTBot, ClaudeBot, Google-Extended, CCBot (allow or disallow); 0.5 = partial; 0 = silent |
| `sitemap_present_linked` | D | 2 | 1 = sitemap.xml exists and referenced from robots.txt; 0.5 = exists but not linked; 0 = missing |
| `https_hsts` | D | 2 | 1 = HTTPS with HSTS header; 0.5 = HTTPS no HSTS; 0 = mixed or HTTP |
| `js_dependency_ratio` | DC | 5 | Server-rendered word count vs Playwright-rendered word count. 1 = ≥80% server-rendered; 0.5 = 40–80%; 0 = <40% |
| `pagespeed_mobile` | DC | 1 | PageSpeed Insights mobile performance score. 1 = ≥75; 0.5 = 50–74; 0 = <50 |

**Category total weight: 20**

### 3.2 Structured data (25%)

| Check key | Type | Weight | Scoring |
|---|---|---|---|
| `schema_organization` | D | 5 | 1 = valid JSON-LD with name, url, logo, sameAs; 0.5 = present but incomplete; 0 = missing |
| `schema_category_appropriate` | DC | 6 | Detect business category, check sample of inner pages for expected schema type. 1 = ≥80% sampled pages; 0.5 = 40–80%; 0 = <40% |
| `schema_faq_howto` | DC | 3 | If FAQ/Q&A content detected in HTML, check corresponding schema applied. 1 = yes; 0.5 = partial; 0 = missing |
| `schema_breadcrumbs` | D | 2 | 1 = BreadcrumbList on inner pages; 0 = missing |
| `og_tags_complete` | D | 3 | 1 = og:title, og:description, og:image, og:url, og:type all present; 0.5 = 2–3 present; 0 = ≤1 |
| `twitter_card` | D | 2 | 1 = twitter:card with image; 0 = missing |
| `schema_validates` | D | 2 | 1 = zero errors; 0.5 = warnings only; 0 = errors |
| `canonical_urls` | D | 2 | 1 = present and self-referential on sampled pages; 0 = missing or wrong domain |

**Category total weight: 25**

### 3.3 Content clarity (25%)

| Check key | Type | Weight | Scoring |
|---|---|---|---|
| `heading_hierarchy` | D | 3 | 1 = one H1, no skipped levels on homepage + 3 sampled pages; 0.5 = minor issues; 0 = broken |
| `semantic_landmarks` | D | 2 | 1 = main, article, nav, header, footer all present; 0.5 = partial; 0 = div-soup |
| `alt_text_coverage` | DC | 2 | 1 = ≥90% content images have non-empty alt; 0.5 = 60–90%; 0 = <60% |
| `publication_dates` | DC | 2 | 1 = both pub + updated dates on sampled content pages; 0.5 = one; 0 = neither |
| `homepage_clarity_rubric` | A | 6 | Claude scores: (a) what business does, (b) who for, (c) outcome, in first viewport. 3 criteria × 2 points. See rubric in §4.1 |
| `query_coverage_rubric` | A | 6 | Claude generates 5 likely AI queries for detected category + location, scores whether site content answers each (0–1 per query). See rubric in §4.2 |
| `faq_content_present` | D | 2 | Regex + heuristic detection of FAQ patterns. 1 = present; 0 = absent |
| `content_depth_linking` | DC | 2 | 1 = avg content-page word count ≥500 and ≥5 internal links; 0.5 = one met; 0 = thin |

**Category total weight: 25**

### 3.4 AI-specific signals (15%)

| Check key | Type | Weight | Scoring |
|---|---|---|---|
| `llms_txt_present` | D | 3 | 1 = valid per llmstxt.org; 0.5 = present but malformed; 0 = missing |
| `llms_full_txt` | D | 1 | 1 = present; 0 = missing |
| `retrieval_vs_training_differentiated` | D | 4 | 1 = site distinguishes OAI-SearchBot from GPTBot, Claude-SearchBot from ClaudeBot (allows retrieval, explicit stance on training); 0.5 = partial; 0 = treats all AI bots identically |
| `waf_not_blocking_ai_bots` | DC | 4 | Fetch homepage with AI-bot user agents. 1 = 200 for all retrieval bots; 0.5 = partial; 0 = widespread 403/challenge |
| `ai_policy_page` | D | 2 | Check common paths (/ai, /ai-policy, footer links). 1 = present; 0 = missing |
| `tdm_headers` | D | 1 | 1 = X-Robots-Tag / TDM reservation header set (either direction); 0 = silent |

**Category total weight: 15**

> **Note on llms.txt weighting**: llms.txt is a low-weight signal because vendor adoption is unclear as of 2026. It indicates an attentive site owner but has minimal direct retrieval impact. We check it and reward presence, but don't overweight.

### 3.5 Authority & trust (15%)

| Check key | Type | Weight | Scoring |
|---|---|---|---|
| `about_page_substantive` | DC | 2 | 1 = About page ≥300 words; 0.5 = present but thin; 0 = missing |
| `contact_info_complete` | D | 2 | 1 = address, phone, email in HTML and schema; 0.5 = some; 0 = none |
| `author_bylines` | DC | 2 | 1 = author name + bio on sampled articles; 0.5 = name only; 0 = anonymous |
| `wikidata_presence` | D | 3 | Query Wikidata by brand name from schema. 1 = entry exists; 0.5 = ambiguous match; 0 = none |
| `sameas_links` | D | 2 | 1 = ≥3 authoritative sameAs links in Organization schema; 0.5 = 1–2; 0 = none |
| `citation_practice` | A | 2 | Claude scores sampled content pages on citation practice (0–1). See rubric in §4.3 |
| `brand_consistency` | D | 2 | 1 = exact match across schema, title, visible copy; 0.5 = minor variations; 0 = inconsistent |

**Category total weight: 15**

---

## 4. AI-graded rubrics

All AI calls use:
- **Model**: Claude Sonnet 4 (complex rubrics) or Claude Haiku 4.5 (category detection). Tune in sprint 4.
- **Temperature**: 0
- **Output**: JSON conforming to a strict schema. Invalid JSON triggers one retry, then the check is marked `not_scored` and excluded from the category total (weights renormalised).
- **Caching key**: `(check_key, prompt_version, content_hash)`. Same inputs → same cached output.

### 4.1 Homepage clarity rubric

**Input**: homepage title, meta description, H1, first 500 words of main content.

**Output schema**:
```json
{
  "what_business_does": { "score": 0|1|2, "evidence": "string (quote or paraphrase from content)" },
  "who_for": { "score": 0|1|2, "evidence": "string" },
  "outcome": { "score": 0|1|2, "evidence": "string" },
  "overall_notes": "string (one sentence)"
}
```

**Scoring guide** (for each criterion):
- `2`: stated explicitly in the first viewport's worth of content, unambiguous.
- `1`: implied or stated weakly, requires inference.
- `0`: not stated or contradictory.

**Normalisation**: sum ÷ 6 × weight (6) = check score contribution.

### 4.2 Query coverage rubric

**Input**: detected business category, detected location (if any), homepage + 3 sampled inner pages concatenated (truncated to 4000 words).

**Process**:
1. Claude generates exactly 5 queries a user in the target market is likely to ask an AI assistant about this category + location.
2. For each query, Claude scores 0–1 whether the site content directly answers it (0 = no relevant content; 0.5 = partial / requires inference; 1 = answers directly).

**Output schema**:
```json
{
  "queries": [
    { "query": "string", "score": 0|0.5|1, "evidence": "string" }
  ]
}
```

Must return exactly 5 queries.

**Normalisation**: sum of scores ÷ 5 × weight (6) = check score contribution.

### 4.3 Citation practice rubric

**Input**: 3 sampled content pages (truncated to 2000 words each).

**Output schema**:
```json
{
  "pages": [
    { "url": "string", "cites_sources": 0|0.5|1, "outbound_authority_links": 0|0.5|1, "notes": "string" }
  ],
  "overall": 0|0.5|1
}
```

**Scoring guide**:
- `1`: clear citations to primary sources and/or outbound links to authoritative domains.
- `0.5`: some outbound linking, but mostly internal or commercial.
- `0`: no outbound linking or citations.

**Normalisation**: overall × weight (2) = check score contribution.

---

## 5. Score bands

| Score | Band | Message used in report |
|---|---|---|
| **85–100** | AI-Ready Leader | Your site is in the top tier for AI discoverability. Focus on maintaining and extending your advantage. |
| **70–84** | Solid foundation | The fundamentals are in place. Targeted improvements will push you ahead of competitors. |
| **55–69** | Partial readiness | Several gaps are costing you AI visibility. A focused 2–4 week programme could lift you into the top tier. |
| **35–54** | Significant gaps | Your site is missing structural elements that AI systems rely on. Acting now avoids falling further behind. |
| **0–34** | High risk | Your site is effectively invisible to the current generation of AI retrieval systems. This is a strategic problem that compounds monthly. |

---

## 6. Positives, negatives, priority actions

### Positives (top 3)
Select the 3 highest-scoring checks (weight × score) from across all categories. Render as: "✓ {human-readable title} — {one-sentence explanation of why it helps}."

### Negatives (top 3)
Select the 3 lowest-scoring checks with the highest weight gap (i.e. `weight × (1 - score)`). Render as: "✗ {title} — {one-sentence explanation of the cost of this gap}."

### Priority actions (top 5, gated report only)
For each failing check (score < 1), compute:
- `impact` = weight × (1 − score)
- `effort` = effort estimate from a static map (`small` | `medium` | `large`)

Rank by `impact / effort_numeric` (small=1, medium=3, large=5). Return top 5.

Each action has: title, why it matters (1 sentence), how to fix (2–3 sentences), effort badge, impact badge, category.

The static effort map lives at `packages/scoring/src/effort-map.ts` and covers every check key. It is the only place effort is defined.

---

## 7. Versioning

When any weight, rubric, or score band changes, increment `SCORING_VERSION` in `packages/scoring/src/version.ts`.

Stored scans record `scoring_version`. Cache hits must match both the 30-day window **and** the current scoring version; a version bump invalidates all caches for fairness.

The methodology page published on the marketing site cites the current version so external readers can verify.
