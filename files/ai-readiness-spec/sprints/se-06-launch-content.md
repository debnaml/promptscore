# SE6 — Launch content pack

**Goal**: Produce the launch assets — first blog post, LinkedIn carousel feature + post, demo video. The week-of-launch content stack.

**Deliverable**: Blog post #1 published, LinkedIn carousel auto-export feature plus a real carousel + caption, demo video shot and edited.

**Branch**: `se-06-launch-content`
**Tag on completion**: `v0.8.0`

---

## Tasks

### SE6.1 — LinkedIn carousel export feature (was S7.6)
"Export for LinkedIn" button on the benchmark detail page. Generates 6 square images (1080×1080) as PNG via Next.js `ImageResponse`:

- **Slide 1** — Title card. "We scored {n} {category} websites for AI readiness" + Performance Peak wordmark
- **Slide 2** — Headline stat. "{x}% scored below 50 — here's what that means" + chart sparkline
- **Slide 3** — Insight 1 with supporting data
- **Slide 4** — Insight 2 with supporting data
- **Slide 5** — Insight 3 with supporting data
- **Slide 6** — CTA. "Run your own scan — link in comments" + URL

Performance Peak branding, colours, type from `02-brand-identity.md`. Output as a downloadable zip.

### SE6.2 — Sharpen the first benchmark
Pick the strongest benchmark for launch (likely the ultra-lux all-inclusive set already run, or a re-run with cleaner labels). Validate:
- All 10 results complete
- Spot-check 3 outlier scores against ground truth
- Edit per-row inline notes for any rankings that need editorial context
- Decide final naming and label conventions for the post

### SE6.3 — Blog post #1
Use the SE7 blog export as a starting point, then editorialise. Publish on `performancepeak.co.uk/blog/` (or `promptscore.co.uk/blog/` if domain switched).

Structure (from original S9.1):
- Lead: why AI readiness matters now for {category}
- Methodology summary (3 paras, link to `/methodology`)
- Ranked table
- Top 3 + bottom 3 deep-dives
- 3 category-level findings
- "Run your own scan" CTA
- Schema.org `Article` + `BreadcrumbList` markup

Cross-promote: short companion post on the other domain linking to the canonical.

### SE6.4 — LinkedIn carousel + post
Use SE6.1 to generate the carousel from the same benchmark used in SE6.3.

Caption (~150 words):
- Hook: one surprising specific finding
- 3-bullet category patterns
- Soft CTA: "Full breakdown including every score: link in comments"

Post from Lee's personal LinkedIn. Companion post from Performance Peak page sharing it.

### SE6.5 — Demo video (was S9.8)
60-second screen recording:
- Paste a URL
- Show the scan running (cut to live, don't time-lapse)
- Show the free result
- Show the email gate
- Show the PDF arriving (time-lapse acceptable here)
- Closing card with URL

Voiceover by Lee. Captions burned in. Export 1920×1080 (landscape, embed on website) and 1080×1080 (square, LinkedIn).

### SE6.6 — Embed the demo video on the homepage
- Below the hero (or in the "How it works" section)
- Lazy-loaded
- Poster frame from the video (no autoplay)

### SE6.7 — Re-run self-scan + screenshot
After SE2 changes, re-scan promptscore itself. If still ≥95, capture the result screenshot and use it on the homepage as a "we score ourselves" proof point.

---

## Acceptance tests

- [ ] LinkedIn export button generates a zip with 6 1080×1080 PNGs.
- [ ] All 6 slides include Performance Peak branding and use brand colours.
- [ ] Blog post #1 is live on the chosen blog domain with correct schema markup.
- [ ] Companion post on the other domain links to the canonical.
- [ ] Posting the LinkedIn carousel preview shows correctly in LinkedIn's preview.
- [ ] Demo video plays in both 1920×1080 and 1080×1080 with captions.
- [ ] Demo video is embedded on the homepage and lazy-loads.
- [ ] Self-scan screenshot is current and shown on the homepage.

---

## Out of scope

- Re-engagement / cold-outreach emails — **SE7**.
- Sales playbook — **SE7**.
- Embed badge — **SE8**.
- Product Hunt launch — defer to **SE10**.
