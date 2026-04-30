# SE8 — Embed badge + benchmark archive

**Goal**: Two free-marketing channels that compound over time — embed badges (drive backlinks from clients' own sites) and a public benchmark archive (drive SEO + AI-citable content).

**Deliverable**: `/badge/[url_hash]` iframe widget for scores ≥85; `/benchmarks/` public archive listing every benchmark we've published, each with its own indexable landing page.

**Branch**: `se-08-badge-archive`
**Tag on completion**: `v0.8.2`

---

## Tasks

### SE8.1 — Embed badge route

- Public route `/badge/[url_hash]` returning a self-contained HTML page suitable for iframe embed
- Renders: PromptScore wordmark, the score (large), score band, "AI readiness" label, link back to the public scan result
- Cached aggressively (1-hour `Cache-Control` + revalidate)
- Returns 404 for scores < 85 (we don't want clients embedding low scores)
- Returns 410 (gone) for stale scans (>180 days old) so badges expire if not re-scanned

### SE8.2 — Badge styling variants

Query string controls minor styling:

- `?theme=light` (default) | `?theme=dark`
- `?size=sm` (220×110) | `?size=md` (300×150 — default)
  Three variants total; render server-side with no JS.

### SE8.3 — Badge install page

Public route `/badge` (admin-facing but open) explaining how to install the badge. Shows:

- Live preview using a sample high-scoring scan
- Copy-paste iframe snippet generator (input: scan URL or hash)
- Eligibility note: "Badges available for scores ≥85"

### SE8.4 — Benchmark archive index

Public route `/benchmarks/` listing every benchmark we've published:

- Card per benchmark: name, category, n URLs, average score, date
- Sorted by date (newest first)
- Click → `/benchmarks/[slug]`

A benchmark is "published" when an admin marks it as such. Add `published boolean default false` and `slug text unique` to `bench_batches`. Edit on `/admin/benchmarks/[id]` lets admin set both.

### SE8.5 — Per-benchmark public page

Public route `/benchmarks/[slug]`:

- Hero: title, summary, methodology link
- Ranked table (no email gate — fully public)
- Top 5 deep-dives (re-using the same data as the blog export)
- "Run your own scan" CTA in the sidebar / footer
- Schema.org `ItemList` + `BreadcrumbList`

### SE8.6 — Indexability

- Each benchmark page included in the sitemap
- Schema.org structured data
- OG image generated per benchmark (similar to per-scan OG from SE1.6)

### SE8.7 — Self-referential test

Run the scanner against `/benchmarks/[slug]` for a published benchmark. It should score ≥80. Iterate until it does.

### SE8.8 — Folds in S7.8 (archive view)

The original "internal benchmark archive" (S7.8) is not built as a separate admin page — the existing `/admin/benchmarks` list already shows everything. The new public-facing `/benchmarks/` archive replaces the need for it.

---

## Acceptance tests

- [ ] `/badge/[url_hash]` renders for a score-≥85 scan in an iframe on a test page.
- [ ] `/badge/[url_hash]` returns 404 for a score-<85 scan.
- [ ] Light, dark, sm, md badge variants render correctly.
- [ ] `/badge` install page shows live preview and a copy-pastable snippet.
- [ ] Admin can mark a benchmark as published and assign a slug.
- [ ] `/benchmarks/` index renders cards for all published benchmarks.
- [ ] `/benchmarks/[slug]` renders the ranked table, deep-dives, methodology link, CTA.
- [ ] Each benchmark page is in the sitemap.
- [ ] Running the scanner on a published benchmark page scores ≥80.

---

## Out of scope

- Customer-uploaded testimonials — defer.
- Embeddable comparison widgets (multiple URLs) — defer to v1.1.
- Linkable per-check anchor pages on benchmark pages — defer.
