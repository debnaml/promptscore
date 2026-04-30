# SE11 — Playwright render worker

**Goal**: Build the Playwright render worker that was deferred in Sprint 2. Without it, `js_dependency_ratio` always scores against static HTML only, JS-heavy SPAs are systematically underscored, and the `target_js_render_failed` error classifier (SE4) has nothing to classify against.

**Deliverable**: A deployed `apps/render-worker/` Node service on Fly.io with Playwright + Chromium, a `POST /render` endpoint, health check, and a wired integration into `FetchContext` so `js_dependency_ratio` and JS-SPA detection work correctly.

**Branch**: `se-11-playwright-worker`
**Tag on completion**: `v0.7.6`

---

## Background

The original spec (S2.6) called for this service from the start, but it was deferred in Sprint 2 and never picked back up. Currently:

- `js_dependency_ratio` compares static HTML word count against... nothing (rendered HTML is empty / missing).
- Sites built entirely on React/Vue/Next.js client-side rendering score the same as static sites.
- The error classifier added in SE4 has a `target_js_render_failed` code with no actual trigger path.

This sprint fixes all three.

---

## Tasks

### SE11.1 — `apps/render-worker/` scaffold

Create the app:

```
apps/render-worker/
  Dockerfile
  fly.toml          (or railway.json)
  package.json
  src/
    index.ts        (Express server)
    render.ts       (Playwright logic)
    health.ts
```

Runtime: Node 20, Alpine base image, Playwright with Chromium (not webkit or firefox — smallest image). Target image size <600MB.

### SE11.2 — `POST /render` endpoint

```
POST /render
Headers: x-render-secret: {RENDER_SECRET}
Body: { url: string, waitUntil?: "domcontentloaded" | "networkidle" }
Returns: { html: string, status: number, performance: { ttfb_ms, lcp_ms } }
```

- 25s hard timeout (kill browser context, return 504)
- Block resource types: font, image, media (faster render, same DOM output)
- Wait until `waitUntil` (default: `domcontentloaded`)
- Return the rendered `document.documentElement.outerHTML` after JS execution
- 401 if `x-render-secret` header is missing or wrong
- If the target URL itself returns 4xx/5xx: return `{ status: N, html: "" }` (not a server error)

### SE11.3 — `GET /healthz`

Returns `{ status: "ok", browser: "ready" }` with 200. Verifies that Playwright can launch a browser context. Used by Fly.io health checks and the Better Stack uptime monitor.

### SE11.4 — Fly.io deployment

- `fly.toml` in `apps/render-worker/`
- Machine: `performance-1x` (1 vCPU, 2GB RAM — Chromium needs the headroom)
- Region: `lhr` (London, matches our Vercel region)
- Min 1, max 3 machines (scale on request queue)
- `RENDER_SECRET` set as a Fly.io secret (not in git)
- Health check at `/healthz` with 30s timeout
- Add `RENDER_WORKER_URL` and `RENDER_SECRET` to Vercel env vars (production + preview)

### SE11.5 — Wire into FetchContext

In `packages/fetch/src/context.ts`, update the `homepage.rendered` fetch:

- Call `POST {RENDER_WORKER_URL}/render` with the canonical URL
- Timeout: 30s (5s headroom over the worker's internal 25s)
- On success: populate `homepage.rendered.html`
- On timeout, 5xx, or `RENDER_WORKER_URL` not set: set `homepage.rendered.html = ""` and add a warning to `FetchContext.warnings` — **never fail the whole scan**
- Log the call: `{ kind: "playwright", scan_id, ms, status: "ok"|"timeout"|"error"|"skipped" }`

### SE11.6 — Fix `js_dependency_ratio` check

Currently the check is likely stubbing or returning 1.0 due to missing rendered HTML. Update it to:

- If `rendered.html === ""`: return `score: null, not_scored: true` (weight redistributed)
- Else: compare extracted word count from `static.html` vs `rendered.html`
  - ≥80% server-rendered → 1
  - 40–80% → 0.5
  - <40% → 0 (JS-only / heavy SPA)

### SE11.7 — Fix `target_js_render_failed` error classifier (SE4)

The SE4 error classifier has `target_js_render_failed` as a reason code. Wire it up:

- If the render worker returns `html === ""` AND `static.html` word count is below threshold (say <200 words) → set failure reason to `target_js_render_failed`
- User-facing message: "This site relies heavily on JavaScript and we couldn't fully render it. That itself is a finding we've factored into the score."

### SE11.8 — Spot-check with JS-heavy sites

Run the scanner on 3 known JS-heavy sites (e.g. Elementor-built WordPress, a React SPA, a Vue storefront). Confirm:

- `rendered.html.length > static.html.length × 1.5` for JS-heavy sites
- `js_dependency_ratio` now scores these correctly (not defaulting to 1.0)
- A static site (e.g. `performancepeak.co.uk`) still scores correctly

### SE11.9 — Update SE4 reference

SE4's timeout table references "Playwright render worker: 25s / 1 retry (5xx only) / static fetch only". Confirm this is implemented exactly (1 retry on 5xx only, not on timeout — retrying a 25s timeout adds 50s to the scan).

---

## Acceptance tests

- [ ] `GET https://render-worker.fly.dev/healthz` returns 200 with `{ status: "ok", browser: "ready" }`.
- [ ] `POST /render` with a valid URL returns HTML. `html.length` > 0 for a standard website.
- [ ] `POST /render` with a missing or wrong `x-render-secret` returns 401.
- [ ] `POST /render` against `https://spa-example.com` (a client-side-rendered site) returns HTML significantly longer than a static `fetch()` of the same URL.
- [ ] `POST /render` against a URL that 404s returns `{ status: 404, html: "" }` (not a worker 500).
- [ ] Running a full scan of `https://performancepeak.co.uk` still completes in <90s with the render worker in the pipeline.
- [ ] `js_dependency_ratio` check returns `not_scored` when `RENDER_WORKER_URL` is unset (backward-compatible fallback).
- [ ] `js_dependency_ratio` scores a known JS-heavy site at <0.5.
- [ ] A scan where the render worker times out still completes (with a warning in `FetchContext.warnings`), no unhandled error.
- [ ] Fly.io dashboard shows the machine is healthy.

---

## Out of scope

- Multiple browser types (Chromium only for now).
- Screenshot / PDF generation (Playwright has this capability; keep it locked out of this endpoint).
- Serving the render worker publicly — it stays internal, called only from the scan pipeline with the shared secret.
