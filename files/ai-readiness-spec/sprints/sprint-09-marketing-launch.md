# Sprint 9 — Marketing launch assets

**Goal**: Produce everything Performance Peak needs to launch the tool publicly with maximum impact.

**Deliverable**: Launch-ready asset pack — blog post #1 (UK luxury resorts benchmark), LinkedIn carousel, sales email templates, embed widget, sample PDF, methodology page, demo video.

**Branch**: `sprint-09-marketing-launch`
**Tag on completion**: `v0.9.0`

---

## Tasks

### S9.1 — Blog post #1: UK luxury resort benchmark
Run the benchmark from sprint 7 end-to-end. Produce a blog post on `promptscore.co.uk/blog/` (primary canonical) titled something like:

> "We scored 10 UK luxury resort websites for AI readiness. Here's what we found."

Cross-promote with a short companion post on `performancepeak.co.uk/blog/` that summarises the finding and links to the full article on promptscore.co.uk — so both domains get inbound links and both ecosystems benefit, without creating duplicate content.

Structure:
- Lead: why AI readiness matters now, specifically for hospitality (AI trip planning, ChatGPT Search recommendations)
- Methodology summary (3 paragraphs + link to full methodology page)
- Ranked table (all 10 results)
- Per-resort deep-dive for top 3 and bottom 3: what they do well, what they miss, what it would take to close the gap
- "Common patterns we saw": 3 category-level findings (e.g. "9 of 10 had zero llms.txt", "7 of 10 block or challenge PerplexityBot via Cloudflare")
- Call-to-action: run your own scan

Editorial tone: observational, specific, useful. No doom-mongering. Name sites by name but frame findings as industry insights, not individual criticism.

### S9.2 — LinkedIn carousel + post
Use the Sprint 7 LinkedIn export. Text copy (approximately 150 words):
- Hook: one surprising finding from the benchmark
- Three-bullet summary of the category patterns
- Soft CTA: "The full breakdown, including every resort's score, is on our blog (link in comments)"

Post from Lee's personal LinkedIn and the Performance Peak page.

### S9.3 — Ikos re-engagement email
Drafted after Ikos has been scanned. Email should include:
- Specific score and 2 specific findings (not generic)
- Reference to the prior Performance Peak relationship (project specifics without overclaiming)
- A framing of the gap as strategic, not tactical: AI search is a distinct channel their current SEO provider isn't optimising for
- A low-pressure CTA: 15-minute call to walk through the report

Template in two variants so you can pick tone ("warm reconnection" vs "confident challenger"). I'll draft both at the end of the sprint.

### S9.4 — Sani re-engagement email
Same pattern as Ikos. Keep it differentiated; avoid mail-merge feel.

### S9.5 — Cold outreach email templates
Three templates for different prospect categories:
- **Hospitality / luxury resort** — similar framing to Ikos/Sani but without prior-relationship references
- **UK law firm** — references the Birketts work without naming the firm; discusses AEO / AI search for legal content
- **Generic** — shorter, more general, for mixed lists

Every template pulls the specific score and top 3 findings automatically from the admin lead-detail page (copy button).

### S9.6 — Embed badge
Small iframe snippet clients can paste on their site once they hit ≥85:

```html
<iframe src="https://promptscore.co.uk/badge/{url_hash}"
        width="220" height="110" frameborder="0" title="PromptScore AI Readiness"></iframe>
```

Renders a small branded badge showing the score and a link back to the public scanner. Cached aggressively. Only available for scores ≥85 to avoid clients embedding low scores by mistake.

### S9.7 — Methodology page
Public page at `/methodology`. Publishes:
- Category weights
- Every check with its weight, type, and scoring rubric (abridged — full rubric in the detailed PDF)
- How AI-graded checks work (including the temperature-0 + cache explanation for credibility)
- Current scoring version
- Change log

This page exists specifically so the tool is defensible to critics and credible to potential enterprise buyers.

### S9.8 — Demo video
60-second screen recording:
- Paste a URL
- Show the scan running
- Show the free result
- Show the email gate
- Show the PDF arriving in inbox (time-lapsed)

Voiceover by Lee. Captions burned in. Export 1920×1080 (landscape) and 1080×1080 (square for LinkedIn).

### S9.9 — Product Hunt / BetaList submission
Prepare launch pages:
- Screenshots (hero, result, PDF preview, admin dashboard teaser)
- One-line tagline
- Description (200 words max)
- First comment ready to post at launch
- Choose launch day (Tuesday or Wednesday; avoid clashing with major AI launches — check calendar the week before)

Skip Product Hunt if the current moment is bad for it; the blog + LinkedIn + outbound sales are where Performance Peak's leads will actually come from.

### S9.10 — Analytics instrumentation
Add event tracking (privacy-respecting — Plausible or self-hosted Umami, not GA4):
- `scan_started` with URL hash (not URL itself)
- `scan_completed` with score band
- `email_gate_viewed`
- `email_gate_submitted`
- `report_viewed`
- `calendar_clicked`

Dashboard at `/admin/funnel` shows the conversion rate at each step.

### S9.11 — Internal sales playbook
One-pager (kept as a markdown doc in `docs/sales-playbook.md`) covering:
- Who's the right buyer (role, company size)
- When to use the tool (opening gambit vs deep-dive)
- Common objections and responses ("isn't this just SEO?" / "we already have an SEO agency" / "AI search is hype")
- Follow-up cadence after the report is sent
- Conversion benchmarks to aim for (lead → call → proposal → close)

---

## Acceptance tests

- [ ] Blog post #1 published on performancepeak.co.uk with clean formatting, valid HTML, correct schema markup (Article + BreadcrumbList — we should practise what we preach).
- [ ] Running the scanner on your own blog post URL returns a respectable score (would be awkward otherwise).
- [ ] LinkedIn carousel renders correctly when uploaded to LinkedIn preview.
- [ ] Re-engagement emails render correctly in Gmail and Outlook; no broken layout in plain-text fallback.
- [ ] Embed badge iframe displays correctly when embedded in a test WordPress page.
- [ ] Methodology page validates against WCAG 2.2 AA and has working anchor links.
- [ ] Demo video plays in both orientations with captions.
- [ ] Analytics events fire correctly on a test scan journey; funnel view shows sensible numbers.
- [ ] Sales playbook reviewed and approved by Lee.

---

## Out of scope for this sprint

- Paid ads.
- Affiliate / partner programme.
- V2 product features.
