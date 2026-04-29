# Sprint 1 — Foundation & infrastructure

**Goal**: Get the skeleton up — repo, deployment, database, CI — so every subsequent sprint ships to a real URL.

**Deliverable**: A deployed Next.js app at `promptscore.co.uk` with a working Supabase connection and a hello-world scan API endpoint.

**Branch**: `sprint-01-foundation`
**Tag on completion**: `v0.1.0`

---

## Tasks

### S1.1 — Next.js project setup
Create Next.js 14 project (App Router, TypeScript, Tailwind). Add shadcn/ui, ESLint (flat config), Prettier, and `vitest` for unit tests. Configure pnpm workspaces root with packages for future `scoring/`, `fetch/`, `ai/`, `db/`, `ui/`.

### S1.2 — GitHub repo + CI
Initialise GitHub repo. Add GitHub Actions workflow that runs on every PR:
- `pnpm install --frozen-lockfile`
- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`

Block merges to `main` if CI fails. Add a `CODEOWNERS` file and a PR template.

### S1.3 — Supabase project + migrations
Provision Supabase project. Write initial SQL migration creating `scans`, `scan_checks`, `leads`, `bench_batches` tables per schema in `00-project-spec.md` §4.2. Generate TypeScript types via Supabase CLI. Commit migration and generated types.

### S1.4 — Vercel + DNS
Configure Vercel project, connect to GitHub `main`. Enable preview deployments for PRs. Point `promptscore.co.uk` DNS (apex domain + `www` CNAME) to Vercel. Verify HTTPS cert issuance.

### S1.5 — Environment variables
Set up env var management: `.env.local` (gitignored), `.env.example` (committed with placeholders), Vercel env (production + preview). Variables needed so far: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SENTRY_DSN`, `UPSTASH_REDIS_URL`, `UPSTASH_REDIS_TOKEN`.

### S1.6 — Stub POST /api/scan
Build `POST /api/scan` that:
- Validates URL (Zod schema: http(s), not private IP, not localhost)
- Writes a row to `scans` with `status='queued'`
- Returns `{ scan_id, status }` with 202

### S1.7 — Stub GET /api/scan/[id] + rate limiting
Build `GET /api/scan/[id]` returning the scan row as JSON. Add rate limiting via Upstash Redis: 10 scan creations per IP per hour. Read endpoint: 60 requests per minute.

### S1.8 — Observability
Install Sentry on the Next.js app (client + server). Add a `/api/health` endpoint returning `{ status: "ok", db: "ok" | "fail" }` based on a trivial Supabase query. Configure a Better Stack uptime monitor hitting `/api/health` every 3 minutes.

---

## Acceptance tests

- [ ] `pnpm test && pnpm lint && pnpm typecheck` passes locally and in CI.
- [ ] Opening `https://promptscore.co.uk` in a browser loads the Next.js default page over HTTPS with a valid cert.
- [ ] `curl -X POST https://promptscore.co.uk/api/scan -d '{"url":"https://performancepeak.co.uk"}' -H "Content-Type: application/json"` returns 202 with a valid UUID `scan_id`.
- [ ] Same request with `{"url":"not-a-url"}` returns 400 with a clear error body.
- [ ] Same request with `{"url":"http://10.0.0.1"}` returns 400 (private IP rejected).
- [ ] Supabase dashboard shows the inserted `scans` row.
- [ ] `GET /api/scan/{valid_id}` returns the row; `GET /api/scan/{random_uuid}` returns 404.
- [ ] 11th scan request within an hour from one IP returns 429.
- [ ] `/api/health` returns 200 with `{ status: "ok", db: "ok" }`.
- [ ] A deliberate `throw new Error("test sentry")` in a test route appears in Sentry within 60 seconds.
- [ ] Better Stack dashboard shows the monitor as "up".

---

## Out of scope for this sprint

- Any scoring logic.
- Any fetching of the target URL beyond reading the submitted string.
- Public homepage design (placeholder Next.js default is fine).
- Email capture, PDF, admin dashboard.
