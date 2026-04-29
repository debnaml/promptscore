# SE10 — Production hardening + v1.0 release

**Goal**: Final hardening (Sentry, Turnstile, queue management, blocklist, load testing), paid-tier decision, public docs, and the v1.0.0 tag.

**Deliverable**: Production monitoring + abuse controls live. Paid tier decided (build or defer). Public API stub, FAQ, glossary, internal runbook published. Tagged release with notes and a "we're out of beta" announcement.

**Branch**: `se-10-v1-release`
**Tag on completion**: `v1.0.0`

---

## Tasks

### SE10.1 — Sentry integration
- Install `@sentry/nextjs`
- Configure DSN via env var
- Source map upload during build
- Release tracking tied to git tags (Vercel env var `VERCEL_GIT_COMMIT_SHA`)
- Alerts:
  - Any uncaught exception → email Lee
  - `scan_failed` rate >5% over 15 min → email + Slack (if configured)
  - AI-call skip rate >10% over 15 min → email
- Daily summary email of top errors

### SE10.2 — Cost monitoring
Already partly in the admin dashboard from S6. Make it robust:
- Hard monthly AI-spend budget (env var)
- If projected spend > budget: public scanner restricts to known users only (whitelist of email-gated leads), banner shown to anonymous users
- Per-scan cost alert: any scan costing >£0.30 → Sentry warn (likely a bug)
- Daily rollup: `cost_daily` table writes from a cron

### SE10.3 — Cloudflare Turnstile on public forms
- Sign up for Turnstile (free)
- Add to `POST /api/scan` and `POST /api/leads`
- Server-side verification of the Turnstile token before processing
- Fail-open for accessibility edge cases but log them

### SE10.4 — Queue management + blocklist
- Soft queue limit: max 100 pending scans globally; new submissions go to a "we're full, try again in N minutes" page (rare, but defensive)
- Per-IP limit: max 3 scans in flight per IP (Upstash Ratelimit — already installed)
- Domain blocklist: static file at `apps/web/src/lib/blocklist.ts` (committed); `POST /api/scan` rejects with 451
- Admin UI to add to the blocklist (writes to a Supabase table; the static file is just the seed)

### SE10.5 — Load testing
- k6 scripts under `scripts/load-testing/`:
  - `scan-burst.js` — 50 concurrent scan submissions
  - `result-poll.js` — 200 concurrent polls of `/api/scan/[id]`
  - `email-gate.js` — 10 concurrent email-gate submissions
- Run against a Vercel preview deployment (not prod)
- Pass criteria: zero 5xx, p95 read response <2s, queue behaviour graceful
- Document the run in `docs/load-test-results.md`

### SE10.6 — Paid-tier prototype (decide + maybe ship)
**First, decide.** Options:
- **A — Defer.** Free-only at v1.0; revisit for v1.1.
- **B — Spec only.** Stripe spike, copy on a `/pricing` page, no checkout live.
- **C — Ship.** Full tier with Stripe checkout and feature gates.

Suggested tiers (if shipping):
- Free: ad-hoc scans, 30-day cache, public results
- Pro £29/month per site: monthly auto re-scan, change alerts, full historical report, priority queue, no email gate on private scans
- Agency £99/month: 10 sites + white-label PDF + competitor tracking + benchmark mode

Decision logged in `docs/decisions/se10-paid-tier.md` with reasoning. If C, implement; if B, ship the page; if A, leave the SE10 task done as "deferred" with a roadmap entry.

### SE10.7 — Public docs
- `/docs/api` — preview / stub describing the future public API (no API shipped)
- `/docs/faq` — common questions, how to improve your score, what each check means (links into methodology)
- `/docs/glossary` — plain-English definitions for every term used in the reports
- `docs/runbook.md` (internal, in repo) — operational runbook for Lee: PageSpeed quota, Claude rate limits, target-site blocks, env-var gotchas, typical bug-hunt steps

### SE10.8 — Tag v1.0.0
- Run full test suite
- Squash any open `TODO(launch)` markers in the codebase
- Tag `v1.0.0`
- Write release notes in `docs/releases/v1.0.0.md` covering the journey from S1 to v1.0
- "We're out of beta" post on LinkedIn referencing early adopters and aggregate stats

### SE10.9 — Retrospective + v1.1 roadmap
- `docs/retrospectives/v1.0.md` covering:
  - What worked, what didn't
  - Per-scan cost vs projection
  - Funnel conversion numbers (from SE5)
  - Lead pipeline impact
  - Top 10 candidate features for v1.1, ranked
- 30-min review session with Lee to confirm v1.1 roadmap

### SE10.10 — Product Hunt / BetaList submission (optional)
Skip if the moment isn't right. If yes:
- Screenshots: hero, result, PDF preview, admin teaser
- One-line tagline
- 200-word description
- First-comment ready
- Tuesday or Wednesday launch, avoid clashing with major AI launches

---

## Acceptance tests

- [ ] Sentry catches a deliberately-triggered uncaught exception; alert email received.
- [ ] Cost dashboard shows per-scan cost in expected range (£0.02–£0.10) for a sample of recent scans.
- [ ] Submitting the public scan form without a valid Turnstile token returns an error.
- [ ] Burst of 50 scans from one IP within a minute → rate-limited cleanly with a clear message.
- [ ] Domain on the blocklist is rejected with 451.
- [ ] k6 load test results documented; pass criteria met.
- [ ] Paid-tier decision logged with reasoning.
- [ ] `/docs/faq`, `/docs/glossary`, `docs/runbook.md` exist and are reviewed.
- [ ] `v1.0.0` tagged; release notes published.
- [ ] Retrospective doc committed.

---

## Out of scope

- Public API implementation — v1.1.
- Full WCAG 2.2 AAA — AA only.
- Multi-language — v1.1.
- WordPress plugin / partner programme — v1.2+.
