# Sprint 6 — Admin dashboard & internal tooling

**Goal**: Give Performance Peak an internal control panel for leads, scans, and operational visibility.

**Deliverable**: Password-protected `/admin` dashboard showing leads, scan queue, scan detail, re-check buttons, CSV exports.

**Branch**: `sprint-06-admin-dashboard`
**Tag on completion**: `v0.6.0`

---

## Tasks

### S6.1 — Admin auth
Supabase Auth with a single admin user (you). Magic-link email login — no passwords. Middleware protects every route under `/admin/*` and every API route under `/api/admin/*`. Redirects to `/admin/login` on failure.

### S6.2 — Admin layout
- Left nav: Leads · Scans · Benchmarks · Cost · Settings
- Top bar: current user email, logout
- Use shadcn/ui `Sidebar` component
- Responsive down to tablet width; mobile is a nice-to-have, not required

### S6.3 — Leads table
Route: `/admin/leads`. Columns:
- Created (with relative time)
- Name, Company, Email
- Website (link to public scan result)
- Score (sortable, colour-coded)
- Status (dropdown: New · Contacted · Qualified · Converted · Not a fit)
- Marketing opt-in (badge)
- Last action (date)

Features:
- Search across name, company, email, website
- Sort by any column
- Filter by status, consent, score range
- CSV export of current filtered view
- Click row → lead detail page

### S6.4 — Lead detail
Route: `/admin/leads/[id]`. Shows:
- All lead fields
- Linked scan summary (mini version of public result)
- "Open full scan" link
- Admin notes (rich text, persisted on save)
- Status timeline (every status change with timestamp)
- Action buttons: "Email this lead" (opens Gmail with templated subject/body), "Mark contacted", "Sync to CRM" (placeholder for future integration)

### S6.5 — Scans table
Route: `/admin/scans`. Columns:
- Created
- URL (truncated, full on hover)
- Category (detected)
- Overall score
- Status (queued/running/complete/failed)
- Cache status (fresh / cached / expired)
- Lead linked (badge if yes)

Features:
- Search by URL
- Filter by status, score range, detected category
- Click row → scan detail
- Re-check button (admin-only, bypasses cache)

### S6.6 — Scan detail
Route: `/admin/scans/[id]`. Shows:
- Full public result view
- Below: every check with raw evidence (JSON expandable)
- Fetch context inspector (robots.txt raw, sitemap URLs, sampled inner pages, AI bot probe results)
- AI call log: for each AI-graded check, show prompt version, input hash, tokens used, latency
- Re-run single check (dev tool — runs one check in isolation and shows output diff)

### S6.7 — Cost dashboard
Route: `/admin/cost`. Shows:
- Total AI spend this month (from logged tokens × published Claude pricing)
- Total PageSpeed API usage
- Estimated per-scan cost (rolling average over last 100 scans)
- Daily scan volume (bar chart, last 30 days)
- Daily cost trend (line chart, last 30 days)

Data source: check-run logs table populated by the AI client from sprint 4. Keep simple — no need for a full analytics pipeline.

### S6.8 — Settings
Route: `/admin/settings`. Editable:
- Scoring version (read-only, shown for reference)
- Rate limit thresholds (public form and admin)
- Domain blocklist (list of domains that can't be scanned)
- Domain always-rescan list (sites where caching is disabled — useful for dev)
- Slack webhook URL for lead notifications
- CRM integration placeholder (for later)

### S6.9 — Check diagnostic tool
Route: `/admin/diagnostics`. Small form:
- Input: URL + check key dropdown
- Runs a single check in isolation against a fresh FetchContext
- Shows result JSON + evidence + any debug info
- Useful when debugging rubric tweaks against specific sites without running a full scan

### S6.10 — Admin audit log
All admin actions (status change, re-check, settings edit, lead notes) recorded in `admin_audit_log` table: `{ id, admin_email, action, target_type, target_id, before, after, timestamp }`. Not visible in UI yet; just captured. Visible view deferred.

---

## Acceptance tests

- [ ] Unauthenticated visit to `/admin` → redirects to login.
- [ ] Magic link login works end-to-end (email received, click, logged in).
- [ ] Leads table shows seeded test data with correct sort/filter behaviour.
- [ ] CSV export downloads cleanly with all expected columns and correct CSV escaping.
- [ ] Lead status change persists and appears in the timeline.
- [ ] Re-check button on a scan creates a fresh row and preserves the old one (old one visible in scans list with "superseded" badge).
- [ ] Scan detail shows expandable evidence for every check.
- [ ] Cost dashboard numbers match hand-calculation from a known sample.
- [ ] Diagnostic tool runs one check against one URL in <20s and shows result.
- [ ] Settings save persists and takes effect (e.g. adding a domain to blocklist rejects its next scan).
- [ ] Admin audit log captures rows for: lead status change, re-check, settings edit.

---

## Out of scope for this sprint

- CRM integration (HubSpot / Pipedrive / etc.) — deferred to v2.
- Multi-admin support — deferred.
- Benchmark mode — sprint 7.
- Audit log UI — deferred.
