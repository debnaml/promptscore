# SE5 — Accessibility + analytics

**Goal**: Two things you must have before launch — public pages pass WCAG 2.2 AA, and you can see what users are actually doing.

**Deliverable**: axe-core clean run on key public pages; Plausible (or Umami) analytics tracking the scan funnel; admin funnel view showing conversion rates.

**Branch**: `se-05-a11y-analytics`
**Tag on completion**: `v0.7.5`

---

## Tasks

### SE5.1 — Accessibility audit

Run axe-core (CLI or browser extension) against:

- `/` (homepage)
- `/scan/[id]` (in-progress)
- `/scan/[id]` (completed)
- `/scan/[id]/unlock` (email gate)
- `/scan/[id]/report` (full report)
- `/methodology`
- `/privacy`

### SE5.2 — Fix all WCAG 2.2 AA violations

Common likely fixes:

- `<button>` vs `<a>` semantics on CTAs
- Form labels properly associated with inputs
- Sufficient colour contrast on muted text
- Focus indicators visible on every interactive element
- Score colour cells need text labels (not colour alone)
- Heading hierarchy (one h1 per page, no skipped levels)
- `alt` text on images / `aria-hidden` on decorative SVGs
- Skip-to-content link

### SE5.3 — Keyboard testing

Manually tab through every public page. Confirm:

- Focus order is logical
- Every interactive element is reachable
- Visible focus state at every step
- No focus traps

### SE5.4 — Privacy-respecting analytics

Choose: Plausible (paid, hosted) or Umami (self-hosted on the existing infra). Recommendation: **Plausible** — cheaper than the time it takes to host Umami well.

Configure cookie-less tracking. Add `<script>` to public layout only (not admin).

### SE5.5 — Custom events

Track the funnel:

- `scan_started` — properties: `category`, `url_hash` (not URL)
- `scan_completed` — properties: `score_band` (Strong / Promising / Needs work), `duration_seconds`
- `scan_failed` — properties: `failure_reason` (from SE4)
- `email_gate_viewed`
- `email_gate_submitted`
- `report_viewed`
- `pdf_downloaded`
- `calendar_clicked` — when user clicks the "book a call" CTA in the report
- `methodology_viewed`

### SE5.6 — Admin funnel view

New admin page `/admin/funnel`:

- Top-line: total scans this week / month
- Funnel chart: scan_started → scan_completed → email_gate_submitted → report_viewed → calendar_clicked
- Conversion % at each step
- Score band distribution
- Top 5 failure reasons (cross-referenced from SE4)

Pulled directly from Plausible's API (or Umami) using server-rendered pages — no third-party dashboards in the admin UI.

### SE5.7 — Privacy policy update

Update `/privacy` to mention:

- Plausible cookie-less analytics
- What's tracked, what isn't
- That URL hashes (not URLs) are tracked
- That scan results are stored for 30 days, lead emails kept until unsubscribe

---

## Acceptance tests

- [ ] axe-core reports zero WCAG 2.2 AA violations on the 7 public pages listed.
- [ ] Tabbing through the homepage with the keyboard reaches every interactive element with visible focus.
- [ ] Plausible (or Umami) shows page views for the homepage within 1 minute of visit.
- [ ] All 9 custom events fire correctly when triggered manually.
- [ ] `/admin/funnel` renders the funnel with sensible numbers from a real day's traffic.
- [ ] Privacy policy mentions analytics provider, tracking scope, and data retention.

---

## Out of scope

- Internal admin-page accessibility — only public pages matter for AA compliance.
- Behavioural analytics (heatmaps, session replay) — defer.
- A/B testing — defer.
