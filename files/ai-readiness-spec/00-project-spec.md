# PromptScore

**Scoring websites for AI readiness.**
**A Performance Peak product.**
**Project spec & 10-sprint build plan** · Version 1.0 · Draft for review
Domain: `promptscore.co.uk`

---

## 1. Executive summary

PromptScore (by Performance Peak) is a freemium web tool that analyses any public website and returns a repeatable score out of 100 reflecting how well the site is prepared for AI-powered discovery — ChatGPT Search, Claude, Perplexity, Google AI Overviews, and the next wave of retrieval agents.

The public tool captures a prospect's email in exchange for a detailed PDF report; the gated report drives Performance Peak's consultancy pipeline.

The scoring model is deliberately heavy on deterministic technical checks (≈75% of the score) and light on AI interpretation (≈25%). All AI calls run at temperature 0 against locked rubric prompts and are cached per URL for 30 days. A second scan of the same URL returns an identical score unless the user explicitly triggers a re-check — critical for credibility in sales conversations and PR-facing benchmarks.

The build is scoped across 10 one-week sprints:

- **Sprints 1–4**: MVP public scanner live.
- **Sprints 5–6**: Freemium product with email gate, PDF, and admin dashboard.
- **Sprints 7–10**: Benchmark mode, hardening, launch assets, v2 foundations.

### 1.1 Business objectives

- Generate qualified consultancy leads via email capture.
- Create PR-ready benchmark datasets (e.g. "Top 10 UK luxury resort websites, ranked by AI readiness") for blog and LinkedIn content.
- Arm Performance Peak with a repeatable, objective opening gambit for sales outreach — particularly for re-engaging lapsed clients (Ikos, Sani) and prospecting in hospitality, legal, and professional services.
- Establish Performance Peak as a credible authority on AI search readiness.

### 1.2 Non-goals for v1

- Not a full technical SEO audit — overlap is incidental; the focus is specifically AI discoverability.
- Not a continuous monitoring product. Historical tracking deferred to v2.
- Not a multi-tenant SaaS. No user accounts beyond email capture.
- Not a white-label product. Performance Peak branding throughout.

---

## 2. Product overview

### 2.1 User journey

1. **Public homepage**: prospect lands on `promptscore.co.uk`. Large URL input, clear value prop, sample report anchors the page.
2. **Scan initiation**: user pastes URL, hits "Scan my site". Loading state runs for 30–60 seconds with progress indicators tied to pipeline stages.
3. **Free result**: user sees overall score, traffic-light grading across five category scores, 3 headline positives, 3 headline negatives. Below the fold, a teaser for the full report behind an email gate.
4. **Email gate**: user submits name, email, company, website (pre-filled). Receives PDF report via Resend + on-screen detailed view.
5. **Follow-up**: email triggers Performance Peak's CRM workflow. Optional opt-in for a 15-minute consultancy call.

### 2.2 Core feature set (v1)

| Feature | Description |
|---|---|
| **Public scanner** | Single URL input, runs full scan, returns overall score + five category scores, 3 positives, 3 negatives. |
| **Detailed report (gated)** | Full breakdown of all checks, explanation of each finding, top 5 priority actions, effort/impact for each. |
| **PDF export** | Branded PDF of the detailed report, delivered via email. Used as sales collateral. |
| **Deterministic cache** | Results cached per URL for 30 days. Same URL returns identical score unless re-check triggered. |
| **Admin dashboard** | Private view of all scans, leads, conversion funnel. CSV export. Used by Performance Peak internally. |
| **Benchmark mode** | Internal tool to queue a list of URLs, run scans in batch, export a comparison table. Used for "Top 10 travel sites" blog post and sales prep. |

---

## 3. Repeatability — the core credibility mechanism

The tool's credibility depends on returning the same score for the same URL on repeated scans. Three mechanisms enforce this:

1. **30-day result cache**: full scan result keyed by normalised URL + content hash of homepage HTML. Subsequent requests within 30 days serve the cached result.
2. **Locked AI prompts at temperature 0**: all AI-graded checks use fixed system prompts, few-shot examples, temperature 0. Output is JSON-schema validated; invalid outputs trigger a single retry, then fail hard.
3. **Explicit re-check**: users can trigger a re-scan, bypassing cache. The old score is preserved in the admin dashboard as an audit trail.

See [`01-scoring-model.md`](./01-scoring-model.md) for the full scoring rubric.

---

## 4. Architecture

### 4.1 Stack

| Layer | Choice |
|---|---|
| **Frontend** | Next.js 14 (App Router) on Vercel. Tailwind + shadcn/ui. |
| **Backend** | Next.js Route Handlers for light endpoints. Long-running scans handled via a queue (Inngest or Trigger.dev). Playwright workers on Fly.io or Railway (Vercel can't reliably run Playwright). |
| **Database** | Supabase (Postgres). Tables: `scans`, `scan_checks`, `leads`, `bench_batches`. |
| **AI** | Anthropic Claude API (Sonnet 4 or Haiku 4.5 depending on check complexity). Temperature 0. Structured output via JSON schema. |
| **Email & PDF** | Resend for transactional email. React-PDF or Puppeteer for PDF generation. |
| **Auth** | Admin dashboard: Supabase Auth (single admin user). Public tool: no auth beyond email capture. |
| **Infra & ops** | Vercel (Next.js). Fly.io or Railway (Playwright worker). GitHub Actions (CI + scheduled benchmarks). Sentry. Better Stack uptime. |
| **Domain** | `promptscore.co.uk` — dedicated brand domain. Performance Peak attribution in the product footer and PDF. |

### 4.2 Data model

Tables are lowercase `snake_case`. Timestamps use `timestamptz`.

**`scans`**
- `id` (uuid, pk)
- `url` (text, indexed) — canonicalised input URL
- `url_hash` (text, indexed) — sha256 of canonical URL, for cache lookups
- `content_hash` (text) — sha256 of homepage HTML at scan time
- `status` (text) — `queued` | `running` | `complete` | `failed`
- `overall_score` (int), `category_scores` (jsonb), `detected_category` (text)
- `positives` (jsonb), `negatives` (jsonb), `priority_actions` (jsonb)
- `started_at`, `completed_at`, `expires_at` (30 days)

**`scan_checks`**
- `id`, `scan_id` (fk), `category`, `check_key`, `score`, `weight`, `evidence` (jsonb), `notes`

**`leads`**
- `id`, `name`, `email`, `company`, `website`, `scan_id` (fk)
- `consent_marketing` (bool), `created_at`, `synced_to_crm` (bool)

**`bench_batches`**
- `id`, `name`, `urls` (jsonb), `status`, `results` (jsonb), `created_at`

### 4.3 Scan pipeline

1. **Input validation**: URL canonicalised (protocol, trailing slash, www handling). Rejected if private IP, localhost, or on blocklist.
2. **Cache lookup**: if a scan exists for this URL within 30 days and no re-check flag, return it.
3. **Fetch stage**: parallel requests for `robots.txt`, `sitemap.xml`, `llms.txt`, homepage (static fetch), homepage (Playwright-rendered), 3 sampled inner pages, AI-bot user-agent probes.
4. **Parse stage**: extract JSON-LD, meta tags, headings, links, word counts. Deterministic checks resolved.
5. **AI stage**: 2–3 calls to Claude (category detection, homepage clarity rubric, query coverage rubric). Prompts locked, temperature 0.
6. **Aggregation**: category scores computed, overall score derived, positives/negatives/priority actions assembled from check results using a rules file.
7. **Persistence**: scan + checks written to DB. `expires_at` set to now + 30 days.
8. **Notification**: client receives result via server-sent events or polling. Email with PDF sent after email capture.

---

## 5. Sprint plan overview

Sprints are one calendar week each. Each sprint has a clear deliverable, a task list, and acceptance tests. Every sprint ends with a tagged git release. Task granularity is designed for Claude Code in VS Code — each task is sized to be executed in one or two focused sessions.

| Sprint | Focus | Delivers |
|---|---|---|
| [1](./sprints/sprint-01-foundation.md) | Foundation & infrastructure | Deployed skeleton with DB, CI, health check |
| [2](./sprints/sprint-02-fetch-parse.md) | Deterministic fetch & parse layer | `FetchContext` builder for any URL |
| [3](./sprints/sprint-03-deterministic-scoring.md) | Deterministic scoring engine | All non-AI checks scored |
| [4](./sprints/sprint-04-ai-checks-mvp.md) | AI-graded checks & public MVP | **Live public scanner** |
| [5](./sprints/sprint-05-email-gate-pdf.md) | Email gate, detailed report, PDF | **Freemium product live** |
| [6](./sprints/sprint-06-admin-dashboard.md) | Admin dashboard & internal tooling | Leads, scans, re-check controls |
| [7](./sprints/sprint-07-benchmark-mode.md) | Benchmark mode | Bulk scan for blog posts + sales prep |
| [8](./sprints/sprint-08-polish-hardening.md) | Polish, performance, abuse controls | Production-ready at 1000 scans/day |
| [9](./sprints/sprint-09-marketing-launch.md) | Marketing launch assets | Blog post, LinkedIn, sales templates, embed badge |
| [10](./sprints/sprint-10-v2-foundations.md) | V2 foundations & historical tracking | Competitor comparison, change-over-time |

---

## 6. Repository layout (target)

```
ai-readiness/
├── apps/
│   ├── web/                  # Next.js app (Vercel)
│   └── render-worker/        # Playwright service (Fly.io)
├── packages/
│   ├── scoring/              # Check registry, aggregator, rubric (pure functions, heavily tested)
│   ├── fetch/                # FetchContext builder
│   ├── ai/                   # Claude prompts (versioned), JSON schemas
│   ├── db/                   # Supabase migrations, generated types
│   └── ui/                   # Shared shadcn/ui primitives
├── fixtures/                 # Frozen HTML snapshots for deterministic tests
├── scripts/                  # One-off ops scripts (bench runs, data exports)
└── docs/                     # This spec + methodology page source
```

Monorepo via pnpm workspaces + Turborepo. Every package has `vitest` tests and runs in CI.

---

## 7. How to use this spec with Claude Code

1. Open this folder (`ai-readiness-spec/`) in VS Code.
2. Work sprint by sprint. For each sprint file, start a fresh Claude Code session and point it at the sprint markdown plus `01-scoring-model.md`.
3. Typical prompt to Claude Code at sprint start:
   > *"Read `sprints/sprint-02-fetch-parse.md` and `01-scoring-model.md`. Implement task S2.1 first. After each task, run the acceptance tests and confirm they pass before moving on. Stop after each task and wait for me to review."*
4. Sprint files are self-contained: you should not need to explain background. If Claude Code asks for context it can't find, that's a spec gap — flag it and I'll revise.
5. Every sprint has an acceptance-tests section. Do not merge a sprint branch until every listed test passes.

---

## 8. Open questions / decisions deferred

- **Brand handles**: register `@promptscore` (or `@promptscoreuk` if unavailable) on LinkedIn, X, Instagram, Bluesky at domain-registration time. Also consider defensive registration of `promptscore.uk` if still available at standard price.
- **Pricing tier**: is there a paid tier above the free report (e.g. monthly re-scan + tracking for £29/mo)? Assumed no for v1; revisit in v2 sprint 10.
- **Claude Haiku vs Sonnet per check**: tune in sprint 4 based on observed quality and per-scan cost.
- **Category detection enum**: finalise the category list in sprint 4 — affects which schema types are expected per site.
- **First benchmark list**: provisional luxury-resort list (see sprint 7). Confirm before sprint 9 launch.
