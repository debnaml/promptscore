# SE4 — Graceful errors + external-call hardening

**Goal**: Stop scans falling over silently. Every failure mode produces a clear human-readable message; every external call has timeouts and fallbacks.

**Deliverable**: Distinct user-facing error messages for the common target-side failure modes; explicit timeouts and retry policies on every external call; stuck-scan cleanup job.

**Branch**: `se-04-error-hardening`
**Tag on completion**: `v0.7.4`

---

## Tasks

### SE4.1 — Target-site error classifier
A single utility (`apps/web/src/lib/scan-errors.ts`) that classifies a target-side failure into a known reason code:
- `target_blocked_cloudflare` — 403/503 with Cloudflare signature
- `target_rate_limited` — 429
- `target_not_found` — 404 on homepage
- `target_server_error` — 5xx on homepage
- `target_robots_disallow` — robots.txt forbids us
- `target_login_wall` — homepage detected as login/paywall (heuristic)
- `target_js_render_failed` — Playwright didn't return content
- `network_error` — DNS / TCP failure
- `unknown` — anything else

Each code maps to a `{ headline, explanation, action }` triple.

### SE4.2 — Persist failure reason on scans
- Add `failure_reason text` column to `scans` (nullable, only set when `status='failed'`)
- Add `failure_detail jsonb` for the raw evidence (url, http status, snippet)
- Worker stores the classified reason on failure
- Public scan result page reads `failure_reason` and renders the matching user-facing message

### SE4.3 — Public failure UI
Update `/scan/[id]` for failed scans to show:
- Headline (from the classifier — e.g. "We couldn't reach this site")
- Explanation (1–2 sentences in plain English)
- Suggested action ("Check the URL", "Try again", or "This site has asked not to be scanned")
- Where applicable: a short note that the failure itself is meaningful ("blocking automated access is a finding for AI readiness")
- "Scan a different URL" CTA

### SE4.4 — External-call timeouts
Wrap every external call with an explicit timeout + retry policy. Targets:

| Call | Timeout | Retries | Fallback |
|------|---------|---------|----------|
| Anthropic / Claude | 30s | 1 | mark all A-checks `not_scored` |
| Google PageSpeed | 15s | 0 | `not_scored` |
| Wikidata | 5s | 0 | `not_scored` |
| Playwright render worker | 25s | 1 (5xx only) | static fetch only |
| Target site fetch | 10s | 0 | classify + fail |
| Resend (email) | 10s | 2 | enqueue for manual retry |

Implementation: a thin `withTimeout(promise, ms, opts)` helper used consistently.

### SE4.5 — Stuck-scan cleanup
- Cron route `/api/cron/cleanup-stuck` (or a Vercel scheduled function)
- Marks any scan with `status='running'` and `started_at < now() - interval '5 minutes'` as failed with `failure_reason='timeout_internal'`
- Same for any `bench_results` row stuck in running

### SE4.6 — Per-call structured logs
Every external call logs a single line containing:
```json
{ "level": "info", "msg": "external_call", "scan_id": "...", "kind": "claude|pagespeed|wikidata|playwright|fetch|resend", "ms": 1234, "status": "ok|timeout|error|skipped", "error": "..." }
```
This makes debugging a single scan reducible to `grep scan_id`.

### SE4.7 — Friendly error UI on the public form
- Reject obviously bad URLs client-side (no protocol, localhost, IP)
- On `POST /api/scan` failure, show the error inline with a clear message
- 451 "this domain is blocklisted" handled as a polite "we don't scan this site" message (foundation for SE10's blocklist tooling)

---

## Acceptance tests

- [ ] Scan a Cloudflare-challenged URL → result page shows the "blocking automated access" message, not a generic crash.
- [ ] Scan a 404 URL → result page shows "URL returned an error".
- [ ] Scan a robots-blocked URL → result page shows "this site has asked not to be scanned".
- [ ] Scan a JS-only SPA where Playwright fails → result page shows the partial-render explanation.
- [ ] Trigger a timeout in the Claude call (mock) → all A-checks marked `not_scored`, scan still completes with a partial score.
- [ ] Manually mark a scan as `running` with `started_at` 10 min ago → cleanup cron marks it failed within one schedule tick.
- [ ] Logs from a single failing scan can be reassembled by `grep scan_id` in Vercel logs.
- [ ] Submitting a bad URL on the public form shows an inline error before submit.

---

## Out of scope

- Admin retry UI for failed scans — defer.
- Cloudflare Turnstile / bot protection — **SE10**.
- Sentry integration — **SE10**.
