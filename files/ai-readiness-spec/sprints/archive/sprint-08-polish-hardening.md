# Sprint 8 — Polish, performance, abuse controls

**Goal**: Harden the public tool for traffic spikes, abusive usage, and edge cases that will come up once promoted.

**Deliverable**: Production-ready tool that handles 1000 scans per day without degradation and rejects abuse cleanly.

**Branch**: `sprint-08-polish-hardening`
**Tag on completion**: `v0.8.0`

---

## Tasks

### S8.1 — Queue management
- Queue depth limits: max 100 pending scans globally, max 3 per IP
- When queue is near full: new submissions go onto a waiting list with an estimated wait time
- Visible queue position on the in-progress page ("You're #4 in the queue, expected wait ~2 minutes")
- Background cleanup: fail any scan stuck in `running` for >5 minutes with a clear reason

### S8.2 — Domain blocklist + allowlist tooling
- Static blocklist: domains serving illegal content, adversarial content, or that have explicitly requested exclusion
- Admin-curated allowlist pattern for cases where the default blocklist is too aggressive
- `POST /api/scan` rejects blocklisted domains with a 451 status and a clear reason

### S8.3 — Graceful target-site error handling
Every scan can fail for legitimate target-side reasons. Each produces a distinct user-facing explanation:

- Target returns 403 / 429 / Cloudflare challenge to our scanner → "We couldn't reach this site — it's blocking automated access. [Here's what that means for your AI readiness]"
- Target returns 404 / 5xx on homepage → "This URL returned an error. Check the address and try again."
- Robots.txt disallows our user agent → "This site has asked not to be scanned. We respect robots.txt, so we can't score it." (offer email-us workflow for the site owner to verify identity and opt in)
- Target is a login page or paywall → detected via heuristic; report as "The homepage is behind a login — we can only score publicly accessible pages."
- Site requires JS for first paint AND Playwright failed → "This site relies heavily on JavaScript and we couldn't fully render it. That itself is a finding we've factored into the score."

### S8.4 — External call timeouts + fallbacks
Every external call has:
- Explicit timeout
- Retry policy (0, 1, or 2 retries with exponential backoff)
- Fallback behaviour (skip check, mark as `not_scored`)
- Correlated log entry with `scan_id`

Targets:
- Claude API: 30s timeout, 1 retry
- PageSpeed API: 15s timeout, 0 retries, quota errors → not_scored
- Wikidata: 5s timeout, 0 retries, failures → not_scored
- Playwright render worker: 25s timeout, 1 retry on 5xx
- Target site fetch: 10s timeout, 0 retries
- Resend (email): 10s timeout, 2 retries, failure → queued for manual retry from admin

### S8.5 — Structured logging
- JSON logs with `{ level, msg, scan_id, check_key, latency_ms, tokens_used, error }`
- Next.js app logs → Vercel log drain
- Playwright worker logs → Fly.io / Railway logs
- Both exportable to a centralised tool (Axiom, Better Stack Logs, or a simple S3 archive)
- Sentry captures uncaught errors + performance traces

### S8.6 — Cost monitoring
Already partly in admin dashboard — make it robust:
- Hard monthly budget: if AI spend projects to exceed budget, public tool throttles to known users only (admin notified)
- Per-scan cost alert: if any single scan costs >£0.30, flag in Sentry (likely a bug)
- Daily rollup job writes to a `cost_daily` table for trend analysis

### S8.7 — Load testing
Use k6 (or Artillery) to simulate:
- 50 concurrent scan submissions
- 200 concurrent /api/scan/[id] polls
- 10 concurrent email-gate submissions

Pass criteria: zero 5xx errors, p95 response time <2s for reads, queue behaviour graceful.

Commit the k6 scripts to `scripts/load-testing/`.

### S8.8 — Bot protection on public form
Add Cloudflare Turnstile (invisible challenge, free, generally non-intrusive). Apply to `POST /api/scan` and `POST /api/leads`. Fail-open for accessibility edge cases but log.

### S8.9 — Error monitoring polish
Sentry dashboards configured:
- Release tracking tied to git tags
- Alert on: uncaught exceptions, scan_failed rate >5% over 15 minutes, AI call skip rate >10% over 15 minutes
- Daily summary email of top errors

### S8.10 — Accessibility pass
Run axe-core against: public homepage, scan-in-progress page, result page, email gate, detailed report page. Fix all AA-level issues. Target WCAG 2.2 AA compliance. This matters both ethically and because the tool preaches about inclusive, semantic, accessible markup.

---

## Acceptance tests

- [ ] Scanning a Cloudflare-challenged site produces a clear user-facing explanation, not a crash.
- [ ] Scanning a robots.txt-blocked URL produces the "site asked not to be scanned" message.
- [ ] Scanning a 404 URL produces "URL returned an error".
- [ ] k6 load test: 50 concurrent scans — zero 5xx errors, all eventually complete or fail gracefully.
- [ ] k6 load test: 200 concurrent polls — p95 <2s.
- [ ] Cost dashboard shows realistic per-scan cost within expected range (£0.02–£0.10).
- [ ] Deliberate burst of 50 scans from one IP within a minute → rate-limited + Turnstile-challenged on subsequent attempts.
- [ ] Blocklisted domain rejected with 451 and clear reason.
- [ ] axe-core reports zero WCAG 2.2 AA violations on key pages.
- [ ] Structured logs from a single scan can be reassembled by filtering on `scan_id` across both Next.js and render-worker logs.
- [ ] Sentry alert fires on deliberately-triggered error; email received.

---

## Out of scope for this sprint

- Marketing launch assets — sprint 9.
- V2 features (competitor comparison, historical tracking) — sprint 10.
- Advanced abuse detection (fingerprinting, ML-based) — defer.
