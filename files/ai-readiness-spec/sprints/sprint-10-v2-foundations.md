# Sprint 10 — V2 foundations & historical tracking

**Goal**: Lay the groundwork for recurring-revenue features while banking quick competitive-comparison wins.

**Deliverable**: Historical tracking visible in the admin dashboard, competitor comparison in the public tool, first scheduled re-scan job, and a decision on paid-tier direction.

**Branch**: `sprint-10-v2-foundations`
**Tag on completion**: `v1.0.0` — **Full v1 milestone**

---

## Tasks

### S10.1 — Historical tracking schema
Add `scan_history` table: `{ id, url_hash, scan_id, scored_at, overall_score, category_scores }`. Every completed scan writes here automatically (including re-checks). Indexed on `url_hash` + `scored_at`.

Retention: keep forever (rows are small). Adds `/admin/scans/[id]/history` showing a timeline of all scans of the same URL.

### S10.2 — Admin trend view
For any URL scanned more than once:
- Line chart: overall score over time
- Five small line charts: each category over time
- Changelog: for each pair of consecutive scans, diff the check results — which checks changed, by how much

Useful for prospect follow-ups: "your score improved 12 points in 3 months after you did X — here's what moved."

### S10.3 — Public competitor comparison (v1.1)
On the free result page, offer: "Compare against up to 3 competitors." User enters URLs, comparison runs in the background, result page extends with a comparison bar chart. Each competitor scan is a normal cached scan (they may even pick up existing cached results, which is efficient).

Gate: competitor comparison requires the email gate to be completed for the original URL. Pitches naturally into: "This is the kind of intelligence we bring to every engagement."

### S10.4 — Scheduled re-scan job
Admin-initiated: "Re-scan this benchmark every 90 days" or "Re-scan this lead's site every 30 days". Cron job (GitHub Actions or Vercel Cron) picks up due jobs and queues them. Results added to history; admin notified if score changes by >5 points.

### S10.5 — Per-URL public history page
Public route `/history/[url_hash]` (no auth). Shows:
- Score over time (if >1 scan exists)
- Relative position against category peers
- A link to scan again

Only shown for scans the public is likely to link to (e.g. embedded via badge). Careful with privacy: show only URL-level data, no lead names.

### S10.6 — Paid-tier prototype (exploratory)
Spec out — do not necessarily ship — a paid tier:
- £29/mo per site: monthly re-scan, change alerts, full historical report, priority queue
- £99/mo for agencies: 10 sites + white-label PDF + competitor tracking

Implementation scope: Stripe checkout, subscription management, site-count enforcement, billing portal. Decide at end of sprint whether to ship or defer to a v1.1 sprint.

### S10.7 — Public benchmark archive
Publish curated benchmark results on performancepeak.co.uk/benchmarks/. Each benchmark is its own landing page with:
- Ranked list (public, no email gate)
- Methodology link
- "Run your own scan" CTA in the sidebar

Acts as SEO + AEO content in its own right — and pleasingly self-referential (the benchmark pages themselves should score well on the scorer).

### S10.8 — Documentation
Write final public-facing documentation:
- `/docs/api` — public API preview (stub for future public API, sprint itself does not ship the API)
- `/docs/faq` — common questions, how to improve your score, what each check means
- `/docs/glossary` — plain-English definitions of every term used in the reports
- Internal `docs/runbook.md` — operational runbook for Lee covering common issues (PageSpeed quota, Claude rate limits, target-site blocks)

### S10.9 — Release
Tag `v1.0.0`. Write release notes covering the journey from sprint 1 to 10. Publish a "we're out of beta" post on LinkedIn referencing early adopters and aggregate stats (e.g. "scanned 847 sites so far; average score was 52/100").

### S10.10 — Retrospective + roadmap
End of sprint retrospective covering:
- What worked, what didn't
- Observed per-scan cost vs projection
- Funnel conversion numbers
- Lead pipeline impact
- v1.1 and v1.2 candidate features, ranked

Commit as `docs/retrospectives/v1.0.md`.

---

## Acceptance tests

- [ ] Scan a URL twice over a week → history view shows both entries with correct timestamps.
- [ ] Admin trend view renders charts correctly for a URL with 3+ scans.
- [ ] Competitor comparison on the free result page works end-to-end; charts render without layout issues.
- [ ] Scheduled re-scan job processes due entries on schedule (verified by triggering manually in admin).
- [ ] Public history page shows score timeline without exposing lead data.
- [ ] Benchmark archive page scores ≥80 on its own scanner (self-referential test).
- [ ] Documentation pages render correctly, internal links work, no broken anchors.
- [ ] Retrospective doc committed and reviewed.

---

## Out of scope for this sprint (→ v1.1+ roadmap)

- Full paid tier launch (unless decision in S10.6 favours shipping it here).
- Public API.
- Multi-language support.
- Slack / Teams integration for change alerts.
- WordPress plugin.
- White-label partner programme.
