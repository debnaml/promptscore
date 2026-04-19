# Sprint 7 — Benchmark mode

**Goal**: Enable bulk scanning for blog-post benchmarks and sales research — the mechanism for producing "Top 10 X" content and prospect-ready sales collateral.

**Deliverable**: Internal `/admin/benchmarks` area where a CSV or pasted URL list is queued, scanned sequentially, and exported as a ranked comparison + blog-ready HTML.

**Branch**: `sprint-07-benchmark-mode`
**Tag on completion**: `v0.7.0`

---

## Tasks

### S7.1 — Benchmark model + UI
Route: `/admin/benchmarks`. List of batches with: name, URL count, status, progress, created date.

Create batch form:
- Name (e.g. "UK luxury resorts — April 2026")
- URLs: paste-in textarea, one per line, OR CSV upload with `url, label` columns
- Category override (optional — forces detected category for fair comparison)
- Delay between scans (default 30s, configurable)

### S7.2 — Batch runner
Background worker processes batches one URL at a time with the configured delay. Updates `bench_batches.progress` after each scan. Resumes on failure. Sends an internal notification email when complete.

Rate-limit respect: never exceed 1 scan per 10 seconds to any single target domain; spread scans across the batch so no target is hit twice in succession.

### S7.3 — Ranked comparison view
Route: `/admin/benchmarks/[id]`. Table columns:
- Rank
- URL (link to public result)
- Label
- Category
- Overall score
- 5 category scores (colour-coded cells)
- Top missing check (one-line, derived from lowest weighted negative)

Features:
- Sort by any column (default: overall score descending)
- Toggle: show/hide individual check columns (over 30 columns when all shown)
- Inline note field per row (for blog editorial)

### S7.4 — CSV export
Full flattened CSV with one row per URL and one column per check. Columns: URL, label, category, overall_score, then all 34 individual check keys with their scores. Two export modes:
- Scores only (for spreadsheets)
- Scores + evidence text (for analysis)

### S7.5 — Blog-ready export
"Export for blog" button produces a Markdown file + an HTML file with:
- Title ("Top 10 {category} websites, ranked by AI readiness — {month}")
- Lead paragraph (placeholder — editor fills in)
- Summary statistics: average score, highest, lowest, most common weakness
- Ranked table (simplified: rank, name, score, one-line commentary)
- Per-entry sections for the top 5: name, score, "what they're doing well" (top 2 positives), "what's holding them back" (top 2 negatives)
- Methodology footer with a link to the public methodology page
- CTA: "Want to know your own score? [Run the scanner]"

Output is a zip containing both formats + any embedded images (score gauges as SVG). Ready to paste into the Performance Peak blog CMS.

### S7.6 — LinkedIn carousel export
"Export for LinkedIn" generates 6 square images (1080×1080) as PNG:
- Slide 1: Title card ("We scored 10 {category} websites for AI readiness")
- Slide 2: Key finding ("{n}% scored below 50 — here's what that means")
- Slides 3–5: Top 3 insights with supporting data
- Slide 6: CTA ("Run your own scan — link in comments")

Uses Next.js `ImageResponse` for generation. Performance Peak branding on every slide.

### S7.7 — First benchmark run
Pre-load a curated "UK luxury resorts" list as the first real benchmark. Candidate list (confirm with Lee before running):
- Ikos Resorts — `ikosresorts.com`
- Sani Resort — `sani-resort.com`
- Six Senses Douro Valley — `sixsenses.com/en/resorts/douro-valley`
- Belmond Le Manoir aux Quat'Saisons — `belmond.com/hotels/europe/uk/oxfordshire/belmond-le-manoir-aux-quatsaisons`
- Gleneagles — `gleneagles.com`
- Cliveden House — `clivedenhouse.co.uk`
- Chewton Glen — `chewtonglen.com`
- Lime Wood — `limewoodhotel.co.uk`
- Beaverbrook — `beaverbrook.co.uk`
- Coworth Park — `dorchestercollection.com/ascot/coworth-park`

Run the batch, review results, hand-verify outlier scores, produce the first Markdown export.

### S7.8 — Benchmark archive
Completed benchmarks stored permanently; historical comparisons possible. UI: `/admin/benchmarks/archive` with a timeline view. Useful later for "same benchmark, 6 months on" follow-up posts.

---

## Acceptance tests

- [ ] Queue 10 URLs → all complete (or fail with clear error), no silent drops.
- [ ] Batch respects per-domain rate limiting (verified by timestamp spread in DB).
- [ ] Ranked view sorts correctly, filters correctly, exports cleanly.
- [ ] Flattened CSV has the right columns and handles special characters (commas, quotes in evidence text).
- [ ] Blog export zip contains valid Markdown and HTML; renders correctly when pasted into a sample WordPress post.
- [ ] LinkedIn export produces 6 1080×1080 PNGs with Performance Peak branding.
- [ ] First luxury-resort benchmark produces sensible relative rankings. Spot-check at least 3 entries against ground truth:
  - Sites with known strong schema score well on Structured Data
  - Sites with heavy Elementor usage show low `js_dependency_ratio` scores
  - Sites behind aggressive Cloudflare score low on `waf_not_blocking_ai_bots`
- [ ] Archive preserves historical benchmarks; running the same URL in a new batch doesn't overwrite the old entry.

---

## Out of scope for this sprint

- Competitor comparison within the public tool — sprint 10.
- Automated scheduled re-runs (e.g. "re-run this benchmark every quarter") — deferred.
- Full brand safety pass on exported copy — editorial handled by Lee manually.
