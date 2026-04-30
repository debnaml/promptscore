# SE12 — Admin completions, GDPR automation + ops

**Goal**: Clear the backlog of explicitly deferred items that weren't assigned to any SE sprint — audit log UI, admin retry UI, queue position display, GDPR deletion automation, centralised log drain, Better Stack uptime monitoring, and benchmark batch scheduling.

**Deliverable**: All deferred S5/S6/S8 admin and ops items built and verified.

**Branch**: `se-12-admin-ops-completions`
**Tag on completion**: `v0.7.7`

---

## Background

These items were each explicitly deferred in an original sprint or SE sprint but never assigned a home:

| Item                               | Originally deferred from                                    |
| ---------------------------------- | ----------------------------------------------------------- |
| Audit log UI                       | S6.10 — "visible view deferred"                             |
| Admin retry UI for failed scans    | SE4 — "defer"                                               |
| Queue position on in-progress page | S8.1 — backend limits done in SE10, UX display not assigned |
| GDPR deletion automation           | S5.8 — "manual for v1, automated in a later sprint"         |
| Centralised log drain              | S8.5 — Sentry in SE10, drain itself not assigned            |
| Better Stack uptime monitor        | S1.8 — Sentry done, uptime monitor omitted from SE sprints  |
| Benchmark batch scheduled re-runs  | S7 deferred, SE9 does single-URL only                       |

---

## Tasks

### SE12.1 — Audit log UI

Route: `/admin/audit-log`. The `admin_audit_log` table is already being written (from S6.10). Build the read view:

- Table: timestamp, admin email, action, target type, target ID (linked), summary of before/after
- Filters: date range, action type, target type
- Click a row → expandable before/after JSON diff (colour-coded)
- Search by target ID (e.g. paste a scan_id to see everything that happened to it)
- Export as CSV (date-ranged)

Link from the admin sidebar under Settings.

### SE12.2 — Admin retry UI for failed scans

On `/admin/scans/[id]` when `status='failed'`:

- "Retry scan" button — queues a fresh scan of the same URL, links it to the same lead (if any)
- Shows the `failure_reason` from SE4 in plain English (same mapping as the public-facing message, but with additional technical detail — raw HTTP status, classifier evidence)
- After retry is queued, shows a "Re-scanning…" inline state with a link to the new scan

On `/admin/scans` list view:

- Failed scans highlighted with the failure reason code as a badge
- "Retry all failed" bulk action (confirmation required) — re-queues up to 20 failed scans at once

### SE12.3 — Queue position on scan in-progress page

Public `/scan/[id]` page while status is `queued`:

- Show "You're currently #N in the queue — expected wait ~X minutes"
- N = count of scans with `status='queued'` and `created_at < this scan's created_at`
- X = N × average_scan_time_minutes (rolling 1-hour average, cached in Redis with 60s TTL)
- Updates on each poll (every 2s)
- If N = 0 ("your scan is next"): show "Your scan is about to start…"

### SE12.4 — GDPR deletion automation

Currently `/privacy/delete` emails Lee for manual action. Replace with a proper flow:

1. User requests deletion at `/privacy/delete` by entering their email address
2. System sends a verification email to that address with a signed link (valid 24h)
3. User clicks link → server:
   - Soft-deletes or anonymises the `leads` row (zero out name, email, company — keep scan_id for aggregate stats)
   - Hard-deletes any Resend contact record (via Resend API)
   - Sets `leads.deletion_requested_at` and `leads.deletion_completed_at`
   - Sends a confirmation email to the original address
4. `leads.unsubscribed = true` is set simultaneously

Signed token uses the same pattern as the unsubscribe token (already in S5.8).

Edge case: if the email has no matching lead, respond with "if we have your data, we've deleted it" (to prevent email enumeration).

### SE12.5 — Centralised log drain

S8.5 specified that structured logs should be exportable to a centralised tool. SE4 adds structured JSON per external call; SE10 adds Sentry for exceptions. The missing piece is a persistent queryable log store.

Recommended: **Better Stack Logs** (Logtail) — same vendor as the uptime monitor (SE12.6), affordable, and has a Vercel log drain integration.

Steps:

- Create a Logtail source; get the drain URL
- Configure Vercel log drain (project settings → log drains → add drain URL)
- Verify logs flowing within 5 minutes of deployment
- Create a saved query in Better Stack for "all external calls for a given scan_id"
- Document the query pattern in `docs/runbook.md`

### SE12.6 — Better Stack uptime monitor

S1.8 specified a Better Stack uptime monitor at `/api/health` every 3 minutes. This was never set up (Sentry covers errors, but uptime monitoring is separate).

Steps:

- Create a Better Stack (Uptime) monitor for `https://{production_domain}/api/health` at 3-minute intervals from multiple regions (UK + EU)
- Alert channel: email to Lee (+ Slack webhook if configured)
- Add the monitor status badge URL to `docs/runbook.md`
- If the `/api/health` endpoint doesn't include a database connectivity check, add it: query one row from `scans`, return `{ status: "ok", db: "ok" | "fail", latency_ms }`

### SE12.7 — Benchmark batch scheduled re-runs

SE9 built single-URL scheduled re-scans. Extend to full benchmark batches:

- On `/admin/benchmarks/[id]`, add a "Schedule re-run" button
- Options: `monthly`, `quarterly`, `manual-only` (default)
- Adds a row to a new `scheduled_benchmarks` table: `{ id, batch_id, cadence, next_run_at, active }`
- Extends `/api/cron/scheduled-scans` (from SE9.4) to also process due `scheduled_benchmarks`:
  - Creates a new `bench_batches` row cloned from the original (same URLs and labels)
  - Queues it via QStash
  - Updates `next_run_at` on the schedule row
- Admin notification email when the batch completes (same as ad-hoc batches)
- `/admin/benchmarks/[id]` shows a "Schedule" badge and next run date if active

---

## Acceptance tests

- [ ] `/admin/audit-log` renders rows for recent admin actions; filter by action type works; before/after diff displays correctly.
- [ ] Failed scan on `/admin/scans/[id]` shows the failure reason and a "Retry scan" button; clicking it creates a new scan row.
- [ ] "Retry all failed" bulk action re-queues up to 20 failed scans with a confirmation step.
- [ ] Public in-progress page shows queue position > 0 when scans are backed up; updates on subsequent polls.
- [ ] Queue position shows "Your scan is about to start…" when position is 0.
- [ ] GDPR deletion flow: enter email → verification email received → click link → lead row anonymised → confirmation email sent.
- [ ] Deletion with an email not in the system still returns a 200 with the "if we have your data, we've deleted it" message (no enumeration).
- [ ] Better Stack Logs shows structured log lines from a scan within 2 minutes of the scan running.
- [ ] Querying by `scan_id` in Better Stack returns all external-call log lines for that scan.
- [ ] Better Stack uptime monitor shows the health endpoint as "up".
- [ ] `/api/health` returns `{ db: "fail" }` when the database is intentionally unreachable.
- [ ] Setting a quarterly schedule on a benchmark creates a `scheduled_benchmarks` row; triggering the cron with `next_run_at` in the past creates a new batch and re-queues it.

---

## Out of scope

- Multi-admin support (separate permissions per admin email) — v1.1.
- Full GDPR audit trail beyond what's already in `admin_audit_log` — v1.1.
- Automated GDPR Subject Access Request (SAR) export — v1.1.
- Log retention policy automation — acceptable to do manually for now.
