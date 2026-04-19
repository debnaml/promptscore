# Sprint 4 — AI-graded checks & public MVP

**Goal**: Add the three AI-graded checks and ship a public version that returns a real score for any URL.

**Deliverable**: Live public page at `promptscore.co.uk` with URL input, real scoring (deterministic + AI), category breakdown, and 3 positives / 3 negatives. No email gate yet.

**Branch**: `sprint-04-ai-checks-mvp`
**Tag on completion**: `v0.4.0` — **MVP milestone**

---

## Tasks

### S4.1 — AI client setup
In `packages/ai/src/client.ts`:
- Anthropic SDK. API key from `ANTHROPIC_API_KEY`.
- Helper `callClaude<T>({ model, systemPrompt, userPrompt, schema, promptVersion })` that:
  - Sets `temperature: 0`
  - Uses structured output via tool-use forced-choice pattern, validated with Zod schema
  - On JSON parse / schema failure: retry once, then return `{ skipped: true, reason }`
  - Logs `{ check_key, prompt_version, input_hash, tokens_used, latency_ms }` for cost monitoring

### S4.2 — Category detection
`packages/ai/src/prompts/category-detection.ts`:
- Model: Claude Haiku 4.5 (`claude-haiku-4-5-20251001`)
- Input: homepage `<title>`, meta description, H1, first 500 words of extracted main content
- Output schema:
  ```ts
  z.object({
    category: z.enum([
      'hospitality-luxury', 'hospitality-budget',
      'legal', 'ecommerce', 'saas',
      'editorial', 'local-services', 'other'
    ]),
    confidence: z.enum(['high', 'medium', 'low']),
    reasoning: z.string().max(200)
  })
  ```
- Prompt version: `v1`. Locked in a constant.

### S4.3 — Homepage clarity rubric
`packages/ai/src/prompts/homepage-clarity.ts`:
- Model: Claude Sonnet 4
- Rubric and schema per `01-scoring-model.md` §4.1
- Prompt includes 2 worked examples (one scoring 6/6, one scoring 2/6) as few-shot anchoring for consistency

### S4.4 — Query coverage rubric
`packages/ai/src/prompts/query-coverage.ts`:
- Model: Claude Sonnet 4
- Rubric and schema per `01-scoring-model.md` §4.2
- Two-stage prompt: first generate 5 queries (constrained to category + location), second score coverage. Implemented as a single call with a tool that returns both stages, to keep input hash deterministic.

### S4.5 — Citation practice rubric
`packages/ai/src/prompts/citation-practice.ts`:
- Model: Claude Haiku 4.5 (cheaper; this check has low weight)
- Rubric and schema per `01-scoring-model.md` §4.3

### S4.6 — AI check caching
AI results cached in `scan_checks.evidence` keyed by `(check_key, prompt_version, content_hash)`. Cache lookup happens *inside* the check's `run()` method — if the current content_hash matches a prior successful AI call for this URL within 30 days, reuse; otherwise call Claude.

This matters because a user could force a re-check while the homepage hasn't changed — no need to spend tokens again.

### S4.7 — Wire AI checks into the registry
Replace the stubs from sprint 3. Update `runChecks()` to include `type: 'A'` checks. Add graceful degradation: if any AI check is `skipped`, its weight is redistributed within its category (not across the whole score).

### S4.8 — Positives / negatives / priority actions generator
`packages/scoring/src/narrative.ts`:

Input: array of CheckResult + Check registry.
Output:
```ts
interface Narrative {
  positives: Array<{ title: string; explanation: string; category: string }>;  // top 3
  negatives: Array<{ title: string; explanation: string; category: string }>;  // top 3
  priorityActions: Array<{
    title: string;
    whyItMatters: string;
    howToFix: string;
    effort: 'small' | 'medium' | 'large';
    impact: 'low' | 'medium' | 'high';
    category: string;
  }>;  // top 5
}
```

Lookup of human-readable titles, explanations, and fix instructions lives in `packages/scoring/src/check-copy.ts` — one entry per check key. This is the copy surface for marketing tone; expect multiple revisions.

### S4.9 — Public homepage
Route: `/`. Components:
- Hero with headline: "Is your website ready for AI search?" (tone TBD — expect copy iteration)
- Large URL input with "Scan my site" button
- Three-column strip: "What it checks" / "How it scores" / "Who it's for"
- Sample report screenshot (use a real scan of performancepeak.co.uk once the tool works)
- Performance Peak footer link

Use shadcn/ui components for inputs and buttons. Tailwind for layout. Keep the page under 60KB of JS.

### S4.10 — Scan-in-progress page
Route: `/scan/[id]`. While status is `queued` or `running`:
- Show an animated progress indicator
- Stream progress messages tied to pipeline stages: "Checking robots.txt…" → "Analysing schema…" → "Testing AI-bot access…" → "Running content analysis…" → "Calculating your score…"
- Poll `GET /api/scan/[id]` every 2 seconds, OR use SSE endpoint if straightforward
- Timeout at 120 seconds → show a "taking longer than usual" state

### S4.11 — Public result page
Same route `/scan/[id]`, switches layout when status is `complete`:
- Hero: overall score in a large circular gauge (0–100), score band label ("Partial readiness"), one-sentence summary
- Category breakdown: 5 rows, each with category name, score out of 100, traffic-light colour, short description
- "What's working" section: 3 positives with ✓ icons
- "What needs attention" section: 3 negatives with ✗ icons
- Teaser card: "Get the full report — 25+ detailed findings, top 5 priority actions, effort estimates. [Unlock free report]" — button is a no-op in this sprint, real in sprint 5
- "Scan another site" CTA
- Share links (Twitter/X, LinkedIn) with dynamic OG image of the score (can stub OG image in this sprint, real generation in sprint 5)

### S4.12 — Error states
- Scan failed (fetch error): clear message, offer to retry, suggest common causes (Cloudflare, auth required, 404)
- Scan timed out: "taking longer than usual, we'll email you when it's done" — for now, just extend polling
- Rate-limited: "you've hit the limit for this hour, try again later"

---

## Acceptance tests

- [ ] End-to-end: paste `https://performancepeak.co.uk` on the public page, see a real scored result within 90 seconds.
- [ ] Category detection correctly identifies 5 test URLs across different categories (spot-checked by hand).
- [ ] Homepage clarity rubric: run against the same fixture 3 times → identical JSON output (deterministic).
- [ ] Query coverage rubric: run against the same fixture 3 times → identical JSON output.
- [ ] Run `https://performancepeak.co.uk` twice within 30 days → identical score returned (cache hit).
- [ ] Trigger a re-check → fresh scan runs, new row in DB, old row preserved.
- [ ] Force an AI API failure (invalid key) → affected check marked `skipped`, overall score still produced with renormalised weights.
- [ ] Scan 5 test URLs of varying quality → scores look reasonable (low-quality site scores <50, high-quality site scores >75).
- [ ] Public homepage Lighthouse score ≥90 on mobile.
- [ ] Positives, negatives, and (in DB) priority actions are populated for every successful scan.
- [ ] Per-scan AI cost stays under £0.08 on average (measured over 20 scans).

---

## Out of scope for this sprint

- Email gate and lead capture — sprint 5.
- PDF generation — sprint 5.
- Detailed gated report view — sprint 5.
- Admin dashboard — sprint 6.
- Benchmark mode — sprint 7.
