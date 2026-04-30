# SE1 — Public site polish

**Goal**: Lift the public-facing pages from "functional MVP" to "professional, trustworthy, on-brand".

**Deliverable**: Homepage, scan-in-progress, result, and email-gate pages all redesigned to a marketing-grade standard. Consistent header/footer, OG image template, refined typography rhythm.

**Branch**: `se-01-public-polish`
**Tag on completion**: `v0.7.1`

---

## Tasks

### SE1.1 — Homepage redesign

Rebuild `/` as a real landing page, not just a URL input box:

- Hero: one-line value prop + supporting sentence + URL input + "Run scan" CTA
- "How it works" — 3 steps with icons (paste URL → scan runs → get scored)
- Sample report screenshot (use a real high-scoring scan, blurred URL if needed)
- "What we score" — 5 category cards summarising the rubric
- Social proof slot (placeholder for now — to be filled with real testimonials post-launch)
- FAQ teaser (3 questions, link to full methodology page from SE3)
- Footer: brand, links to methodology / privacy / Performance Peak
- Sticky header: PromptScore wordmark + "by Performance Peak" microtag, link to methodology

### SE1.2 — Scan-in-progress page polish

Currently functional but plain. Add:

- Branded loading animation (subtle, not flashy)
- Micro-explanations as each phase runs ("Fetching robots.txt…", "Parsing structured data…", "Asking the AI grader…")
- ETA countdown (rough, based on average scan time)
- "Don't close this tab" reassurance + auto-resume if they do

### SE1.3 — Result page polish

This is the most-shared page. Make it shareable:

- Bigger, bolder overall score with score-band label ("Strong" / "Promising" / "Needs work")
- Five category cards laid out as a clean grid, colour-coded
- "Top 3 quick wins" panel (priority actions, plain English)
- "Top 3 strengths" panel (positives)
- Email-gate CTA polished — headline, two-line benefit, single field
- Share buttons: copy link, share on LinkedIn (with pre-filled post text)

### SE1.4 — Email-gate UX polish

- Clearer benefit copy ("Get the full 34-check breakdown as a PDF + we'll email you the report")
- Inline validation (no full-page reload on error)
- Loading state on submit
- Success state shows "PDF on its way to {email}" with re-send option

### SE1.5 — Header / footer / nav consistency

- Single shared `<SiteHeader />` and `<SiteFooter />` components
- Header on every public page
- Footer on every public page (privacy, methodology, Performance Peak)
- Mobile responsive (hamburger menu only if there's actually nav to fit)

### SE1.6 — Open Graph image template

- Dynamic OG image at `/api/og` using Next.js `ImageResponse`
- Default OG image for homepage / methodology / blog
- Per-scan OG image at `/api/og/scan/[id]` showing the scanned URL + score (so when results are shared on LinkedIn the preview is gorgeous)
- 1200×630, brand-correct typography + colours

### SE1.7 — Visual / typography rhythm

- Audit all public pages for consistent spacing scale (use Tailwind spacing tokens)
- Consistent type scale across pages (one h1 size, one h2, one body, etc.)
- Verify all colours come from the palette in `02-brand-identity.md`
- Remove any leftover greys / blues that aren't on-brand

---

## Acceptance tests

- [ ] Homepage renders the hero, 3 steps, 5 category cards, FAQ teaser, footer.
- [ ] Pasting a URL into the homepage hero starts a scan as expected.
- [ ] Scan-in-progress page shows phase microcopy and ETA.
- [ ] Result page displays score, categories, quick wins, strengths in the new layout.
- [ ] Email gate shows inline validation and success state without a full reload.
- [ ] OG image preview renders correctly when the homepage URL is shared in LinkedIn / Slack / Twitter preview tools.
- [ ] Per-scan OG image renders the URL and score for an existing completed scan.
- [ ] No layout shift on load (CLS < 0.1).
- [ ] All pages render correctly on mobile (375px), tablet (768px), desktop (1280px).

---

## Out of scope

- Marketing copy beyond rough placeholder — final copy belongs to **SE6**.
- Demo video — **SE6**.
- Methodology page content — **SE3**.
