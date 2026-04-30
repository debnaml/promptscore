# SE3 — Methodology page + public credibility

**Goal**: Build the public credibility surface — a methodology page that explains every check, every weight, and how scoring works. This is the page enterprise buyers and journalists will read before deciding the tool is serious.

**Deliverable**: Public `/methodology` route with the full 34-check rubric, AI-grader explanation, scoring version + changelog, FAQ, and structured data.

**Branch**: `se-03-methodology`
**Tag on completion**: `v0.7.3`

---

## Tasks

### SE3.1 — Methodology page structure

Public route `/methodology` with sections:

1. **What we score** — the 5 categories with weights (the table from `01-scoring-model.md`)
2. **How a score is calculated** — overview of the rubric: D vs DC vs A check types, weighted aggregate
3. **The 34 checks** — table grouped by category, with key, weight, type, scoring rubric (1-line each)
4. **AI-graded checks** — explain temperature 0, locked prompt IDs, the 30-day cache, repeatability
5. **Score bands** — what "Strong / Promising / Needs work" mean
6. **Scoring version + changelog** — current version + changes over time (initially: "v1.0 — initial release")
7. **FAQ** — 8–12 anticipated questions

### SE3.2 — Generated content from `01-scoring-model.md`

- The check table is generated at build time from `ALL_CHECKS` + `CHECK_COPY` so it stays in sync with the actual scorer
- Source of truth: scoring package, never hand-maintained Markdown
- Each row: check key, plain-English title (from CHECK_COPY), category, weight, type, what scores 1.0 / 0.5 / 0

### SE3.3 — FAQ content

Draft answers (Lee approves) for at least:

- "Is this just SEO?"
- "Why does my score change between scans?" (cache + content hash explanation)
- "Why is X check graded by AI?"
- "What's the difference between retrieval bots and training bots?"
- "We block PerplexityBot via Cloudflare — should we unblock it?"
- "How often should we re-scan?"
- "Can I get a private scan?" (no — but admin can mark public results private on request)
- "Who built this?" (Performance Peak, link to about page)
- "How can I improve my score?"
- "Is the score guaranteed accurate?" (honest disclaimers)

Each FAQ entry has a stable anchor (`#why-does-my-score-change`).

### SE3.4 — FAQPage structured data

JSON-LD `FAQPage` schema with every Q&A so Google + AI search engines can surface answers directly.

### SE3.5 — Visual treatment

- Match the SE1 brand polish (colours, type scale)
- Long-form readable layout (max-width 720px for prose)
- Tables full-width with score-colour cells
- Sticky table-of-contents on desktop linking to each section anchor

### SE3.6 — Link from key surfaces

- Footer (every page)
- Result page ("How is this scored?" link near the score)
- PDF report cover page
- Email gate page
- Email footer

### SE3.7 — Methodology version metadata

- Display current `SCORING_VERSION` (already in `@promptscore/scoring`)
- Changelog table: version, date, what changed
- Archived version history at `/methodology/versions/[version]` (just plain pages — initially v1.0 only)

---

## Acceptance tests

- [ ] `/methodology` renders all 34 checks generated from `ALL_CHECKS`.
- [ ] Adding a check to `ALL_CHECKS` and rebuilding shows it on the page automatically.
- [ ] FAQPage schema validates against the Schema Markup Validator.
- [ ] Sticky TOC works on desktop, scrolls to correct anchors.
- [ ] All in-page anchors link correctly (no broken `#fragment` links).
- [ ] Page is server-rendered with all content visible without JS.
- [ ] Page passes WCAG 2.2 AA via axe-core.
- [ ] Footer link from every public page reaches `/methodology`.

---

## Out of scope

- Per-check deep-dive pages (one page per check) — defer to v1.1.
- Interactive scoring playground — defer.
- Translations — defer.
