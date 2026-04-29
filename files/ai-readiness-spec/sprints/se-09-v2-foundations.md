# SE9 — Commercial v2 foundations (history, competitor, scheduled)

**Goal**: The features that make this a recurring product instead of a one-shot scanner — historical tracking, competitor comparison, scheduled re-scans.

**Deliverable**: Every scan written to history. Admin trend view for any URL. Public competitor comparison (gated behind email). Scheduled re-scan jobs.

**Branch**: `se-09-v2-foundations`
**Tag on completion**: `v0.9.0`

---

## Tasks

### SE9.1 — `scan_history` table
Migration adding:
```sql
create table scan_history (
  id          uuid primary key default gen_random_uuid(),
  url_hash    text not null,
  scan_id     uuid not null references scans(id) on delete cascade,
  scored_at   timestamptz not null,
  overall_score integer not null,
  category_scores jsonb not null
);
create index idx_scan_history_url_hash_scored_at on scan_history (url_hash, scored_at desc);
```
Worker writes a row on every successful scan completion. Backfill from existing completed scans.

### SE9.2 — Admin trend view
Route `/admin/scans/[id]/history`:
- Line chart: overall score over time (one point per scan of the same `url_hash`)
- 5 small line charts: each category over time
- Changelog table: for each consecutive pair, diff the per-check scores; show only checks that changed by ≥10 points

Useful copy: "Your score improved 12 points in 3 months — here's what moved."

### SE9.3 — Public competitor comparison
On the result page, after the email gate is unlocked, show a "Compare against competitors" section:
- Input: 1–3 competitor URLs
- Submit triggers competitor scans (using the cache where possible)
- Result: comparison bar chart (overall + 5 categories) with rows for the original site + competitors
- Persist the comparison so it can be re-opened with a unique URL

Gate: only available after the email gate is completed for the original URL.

### SE9.4 — Scheduled re-scan jobs
- Migration: `scheduled_scans` table — `{ id, url, label, cadence ('weekly'|'monthly'|'quarterly'), next_run_at, created_by, active boolean }`
- Cron route `/api/cron/scheduled-scans`: queries for `next_run_at <= now() and active`, queues each via QStash, updates `next_run_at`
- Vercel scheduled function configured to hit it every 30 minutes
- Admin UI on lead-detail and benchmark-detail pages to "schedule re-scan" with cadence

When a scheduled scan completes and the score has changed by ≥5 points, send Lee a notification email.

### SE9.5 — Public per-URL history page
Route `/history/[url_hash]` (no auth):
- Header: hostname + most recent score
- Score-over-time chart
- Optional: relative position vs scanned peers in the same category
- "Re-scan now" CTA

Privacy: only show URL-level data. No lead names, no email-related metadata.

Only linked from: the embed badge (SE8) and per-scan result pages once history exists. Not in the sitemap.

### SE9.6 — "Re-check" button on scan results
- "Re-scan" button on `/scan/[id]` and `/admin/scans/[id]`
- Bypasses the 30-day cache, runs a fresh scan, links the new scan to the same `url_hash`
- New entry appears in history immediately

This is technically already in the spec (part of repeatability) — verify it's wired and writes to `scan_history`.

---

## Acceptance tests

- [ ] Scanning the same URL twice writes two rows to `scan_history`.
- [ ] `/admin/scans/[id]/history` charts render for any URL with ≥2 scans.
- [ ] Changelog highlights only checks that moved by ≥10 points between consecutive scans.
- [ ] Public competitor comparison gated behind email gate; works end-to-end with up to 3 competitors.
- [ ] Scheduled re-scan job fires at the correct cadence (verified by setting `next_run_at` to past and triggering the cron).
- [ ] Scheduled-scan completion with ≥5-point change sends Lee an email.
- [ ] `/history/[url_hash]` shows score timeline without exposing lead data.
- [ ] Re-scan button creates a new scan, writes to `scan_history`, and the result is visible immediately.

---

## Out of scope

- Paid-tier gating on these features — **SE10**.
- Multi-URL bulk scheduling — defer.
- Slack / Teams notifications on score change — defer.
