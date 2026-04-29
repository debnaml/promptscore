# Sprint 5 — Email gate, detailed report, PDF export

**Goal**: Turn the MVP into a freemium product with lead capture and a deliverable PDF.

**Deliverable**: Public scan → free summary → email gate → detailed on-screen report + branded PDF delivered by email.

**Branch**: `sprint-05-email-gate-pdf`
**Tag on completion**: `v0.5.0` — **Freemium product live**

---

## Tasks

### S5.1 — Email gate component
Route: `/scan/[id]/unlock`. Component on the result page opens this inline or as a modal.

Fields:
- Name (required)
- Email (required, validated)
- Company (required)
- Website (pre-filled from scan, editable)
- Role (optional, dropdown: Marketing, SEO, Dev, Founder, Other)
- Marketing opt-in checkbox (unticked by default; explicit consent)
- Privacy policy link

Submit → `POST /api/leads` creates a `leads` row linked to the scan, triggers PDF generation, redirects to detailed report view. Include honeypot field for basic bot mitigation.

### S5.2 — Detailed report page
Route: `/scan/[id]/report`. Gated by a signed cookie set on successful lead submission. Contains:

- Hero: same score + band as free view
- Table of contents: 5 categories + priority actions + methodology link
- Each category section: category score, short narrative, list of every check with:
  - Title (human-readable)
  - Score indicator (✓/!/✗)
  - Evidence snippet (e.g. "We found 3 schema blocks on your homepage, type: Organization, LocalBusiness")
  - Fix suggestion if score <1
  - Effort/impact badges
- Priority actions section: top 5, detailed
- "What to do next" CTA: book a 15-minute Performance Peak consultation (Calendly link)
- Methodology footer link

### S5.3 — Priority-action engine
Enhance `narrative.ts` from sprint 4: for each failing check, compute `impact = weight × (1 − score)` and look up `effort` from the effort map. Rank by `impact / effortNumeric` where `small=1, medium=3, large=5`. Return top 5 with the check-copy lookup providing `howToFix` text per check.

### S5.4 — Resend setup
- Create Resend account (or use existing Performance Peak account)
- Verify sending domain `promptscore.co.uk` (transactional mail from `reports@promptscore.co.uk`)
- Set up SPF, DKIM, DMARC on the `promptscore.co.uk` DNS
- Create the delivery email template (React Email or handwritten HTML):
  - From: "PromptScore <reports@promptscore.co.uk>"
  - Reply-to: Performance Peak contact (so replies route to Lee)
  - Subject: "Your PromptScore AI Readiness Report for {domain}"
  - Body: short intro, score, 3 priority actions, PDF attachment, CTA to book a call with Performance Peak
  - Plain-text fallback

### S5.5 — PDF generator
Choice: React-PDF (`@react-pdf/renderer`) for maintainability. If complex layout proves painful, fall back to Puppeteer rendering a hidden React page.

Contents:
- Cover page: PromptScore logo (primary) with "a Performance Peak product" lockup, scan URL, date, overall score
- Page 2: executive summary (score + one-paragraph narrative + top 3 priorities)
- Pages 3–7: per-category deep-dive (one page per category)
- Page 8: priority actions (top 5) with full detail
- Page 9: methodology + Performance Peak contact details and Calendly link

Branded with PromptScore colours (primary product brand) with a Performance Peak endorsement line in the footer. Arial or similar broadly-supported font. Footer: page number + "PromptScore by Performance Peak · {date} · promptscore.co.uk".

### S5.6 — PDF generation pipeline
- Called after email gate submission
- Runs async in background (Inngest or Vercel Function with 60s max)
- Uploads PDF to Supabase Storage (private bucket, signed URLs)
- Emails PDF link via Resend
- Updates `leads.pdf_generated_at`

### S5.7 — GDPR compliance
- Consent recorded on the `leads` row: `consent_type`, `consent_timestamp`, `consent_ip` (hashed)
- Privacy policy page published at `/privacy`
- Cookie banner using defaults appropriate for UK/EU visitors (essential cookies only; analytics cookies off by default)
- Data retention: leads retained indefinitely unless unsubscribe/deletion request; scan results expire after 30 days unless tied to a lead

### S5.8 — Unsubscribe + deletion
- Unsubscribe link in every email (`/unsubscribe?token=...` using a signed token)
- Sets `leads.unsubscribed = true`, suppresses future sends
- Deletion request handler at `/privacy/delete` with email verification — manual process for v1 (emails Performance Peak admin), automated in a later sprint

### S5.9 — Internal notifications
New lead creates:
- Email to `lee@performancepeak.co.uk` (or configured admin email) with lead details and scan summary
- Optional Slack webhook (env-configurable) posting to a `#leads` channel

### S5.10 — OG image generation
Dynamic OG image for each scan (for share links):
- Next.js `ImageResponse` API
- Shows: "AI Readiness Score: 67/100 — performancepeak.co.uk" with Performance Peak branding
- Cached via Vercel CDN

---

## Acceptance tests

- [ ] Submit the email gate form → receive a branded PDF in your inbox within 60 seconds.
- [ ] PDF renders correctly: logo, score, all category sections, priority actions. No broken layout on print.
- [ ] PDF link is a signed URL that expires after 7 days.
- [ ] `leads` row created with correct consent flags and timestamp.
- [ ] On-screen detailed report at `/scan/[id]/report` matches the PDF content.
- [ ] Without a valid gate cookie, `/scan/[id]/report` redirects to the email gate.
- [ ] Unsubscribe link flips the flag and suppresses the next send attempt.
- [ ] Privacy page and cookie banner comply with UK GDPR (essential cookies only by default).
- [ ] Admin email received on new lead submission within 30 seconds.
- [ ] Dynamic OG image renders correctly when a scan share link is pasted into LinkedIn or Slack.
- [ ] Send 20 test submissions — zero deliverability failures, no spam-folder placements (test via mail-tester.com score ≥8/10).

---

## Out of scope for this sprint

- Admin dashboard — sprint 6.
- Benchmark mode — sprint 7.
- Abuse controls and load testing — sprint 8.
- Marketing launch — sprint 9.
