# PromptScore — Brand identity brief

Lightweight brand guide so Claude Code has consistent direction from sprint 1. Full identity work can come later if the product gains traction; this is the minimum viable brand needed to ship without looking like another generic SaaS tool.

---

## 1. Positioning

**What it is**: a tool that scores how ready a website is for AI-powered discovery.

**Who it's for (primary)**: marketing directors and in-house digital leads at UK mid-market and enterprise businesses — especially hospitality, legal, and professional services — who are hearing "AI search" in every board meeting and don't know whether their site is positioned for it.

**What it competes against (perception)**: gut-feel agency promises, generic SEO audits that don't cover AI, vague "we track ChatGPT mentions" products that are hard to act on.

**What makes it different**: the score is repeatable (same URL → same result), the checks are published (methodology page), and every finding comes with a concrete action. It's defensible because it's measured, not vibes.

**Tone of voice**: observational, specific, quietly confident. Not alarmist ("you're invisible!") and not breathless ("AI is the future!"). More like an experienced consultant pointing at something the client hadn't noticed. Reference points: Ahrefs blog, Basecamp writing, UK broadsheet business journalism. Never: growth-hack copywriting, excessive emoji, "game-changing", "unlock", "10x".

---

## 2. Name

**PromptScore** (one word, both caps).

- In headlines: `PromptScore`
- In body: `PromptScore`
- In metadata / URLs: `promptscore`
- Descriptor when needed: "AI readiness scoring" (lowercase, not a proper noun)
- Endorsement: "by Performance Peak" or "a Performance Peak product" — always secondary, never larger than the PromptScore wordmark

**Never**: "Prompt Score" (two words), "promptScore" (camelCase in UI), "PROMPTSCORE" (all caps outside of specific contexts like a UI badge).

---

## 3. Visual identity

Keep it minimal and professional. The tool's credibility is tied to looking trustworthy, not flashy. Avoid gradients, glassmorphism, generic AI-visual clichés (circuit board patterns, glowing brains, etc.).

### Colour palette

| Role | Name | Hex | Usage |
|---|---|---|---|
| Primary | PromptScore Navy | `#0B1F3A` | Headers, primary text, logo base |
| Accent | Signal Blue | `#2F6BDB` | Links, primary CTA buttons, brand accents |
| Positive | Signal Green | `#1A9F5D` | Green traffic lights, positive check indicators |
| Warning | Signal Amber | `#D97706` | Amber traffic lights, medium-severity findings |
| Negative | Signal Red | `#C73030` | Red traffic lights, high-severity findings |
| Neutral dark | Slate 900 | `#0F172A` | Body text |
| Neutral mid | Slate 500 | `#64748B` | Secondary text, labels |
| Neutral light | Slate 100 | `#F1F5F9` | Card backgrounds, subtle dividers |
| Background | White | `#FFFFFF` | Main canvas |

Traffic-light colours for category scores are deliberately muted (not pure `#00FF00` etc.) so they read as professional data visualisation rather than a traffic light. Ensure all text combinations meet WCAG AA contrast (test during sprint 4 UI build).

### Typography

- **Headings**: Inter (weights 600 + 700). Widely available via Google Fonts, reads well on screens, professional without being corporate-stiff.
- **Body**: Inter (weight 400 + 500). Same family keeps the stack simple.
- **Monospace** (for code, URLs in UI, scan IDs): JetBrains Mono or the system `ui-monospace` stack.

One-family approach reduces load time and keeps the brand coherent. No serif display font — would feel too editorial for a technical tool.

### Logo

Wordmark-only for v1. No mascot, no abstract mark. Reasoning: a wordmark is faster to produce, renders at every size, and doesn't commit the brand to a visual concept before we know what resonates.

Lockup spec:
- "PromptScore" set in Inter Bold, tracking -0.01em
- In PromptScore Navy (`#0B1F3A`) on light backgrounds, white on dark
- Endorsement lockup (for PDF cover, email footer, etc.): stacked wordmark with "by Performance Peak" underneath in Inter Medium at 50% size, Slate 500 colour

If you want a graphic device later, the strongest option would be a small circular gauge (0–100 dial) rendered to the left of the wordmark — literally what the tool produces. Defer until after first launch.

### Score gauge (the hero visual)

The circular score gauge is the brand's signature visual element. It appears on: the homepage hero after a scan, the public result page, the PDF cover, OG images, LinkedIn carousels, and the embed badge.

Specification:
- Circular arc from ~225° to ~-45° (bottom opening, like a speedometer)
- Track: Slate 100
- Fill: colour-coded by score band (Red <35, Amber 35–54, Amber-green 55–69, Green 70–84, Deep green 85–100)
- Number in the middle: Inter Bold, large, Navy
- Label below the number: "out of 100" in Inter Medium, Slate 500, small

This visual is consistent across every touchpoint and becomes the most recognisable thing about the brand. Treat it as sacred — no colour variations, no 3D effects, no animations beyond a clean count-up on first render.

---

## 4. Copy patterns

### Hero headline options (pick one in sprint 4, A/B test later)

1. "Is your website ready for AI search?"
2. "Can ChatGPT find your business?"
3. "Score your site for AI readiness."

Recommendation: lead with option 1 for the public homepage. It's the question the buyer is already asking internally.

### Subhead

"PromptScore analyses your site against 34 AI readiness signals — from schema markup to crawler access — and returns a repeatable score out of 100. Free scan. Detailed report in your inbox."

### CTA button copy

- Primary: "Scan my site"
- Secondary (result page): "Get the full report"
- Tertiary (sales hook): "Book 15 minutes with Performance Peak"

### How we describe findings

- Positives: start with a ✓, past tense, matter-of-fact. "✓ Your Organization schema is complete, including sameAs links to authoritative profiles."
- Negatives: start with a ✗, present-tense statement of the gap followed by the cost. "✗ Your robots.txt doesn't differentiate AI retrieval bots from training bots. This means all AI crawlers are treated identically, costing you visibility in ChatGPT Search and Perplexity."
- Priority actions: imperative voice, action-first. "Add `llms.txt` at your site root." / "Remove the Cloudflare challenge for PerplexityBot."

Never write in second-person alarm ("You're failing!" "Your site is invisible!"). Always frame findings as observable facts with consequences the reader can draw themselves.

---

## 5. Brand architecture with Performance Peak

PromptScore is a **product brand**; Performance Peak is the **parent / service brand**.

**When PromptScore stands alone**:
- On the domain promptscore.co.uk
- In the product UI
- On the score gauge
- In tool-specific social posts and content

**When Performance Peak appears alongside**:
- PDF cover ("PromptScore — a Performance Peak product")
- Email footer ("Delivered by PromptScore. For consultancy, contact Performance Peak.")
- "Book a call" CTAs (always to Performance Peak's Calendly)
- Methodology page footer
- Blog author byline (post is by the PromptScore team, but always signed "Performance Peak")

**When only Performance Peak appears**:
- Prospecting and sales emails send from Performance Peak, referencing PromptScore findings
- Client proposals quote PromptScore score but the engagement is a Performance Peak engagement
- Performance Peak's own website has a section for PromptScore but leads never enter the funnel from performancepeak.co.uk — they go through promptscore.co.uk

This architecture lets PromptScore build its own SEO, links, and brand equity while keeping every sales conversation grounded in Performance Peak's consultancy.

---

## 6. What NOT to do

- No robot / brain / circuit icons. Every AI tool has them. PromptScore does not.
- No "powered by AI" badges or AI chips in the UI. The product uses AI; it isn't pretending to be AI.
- No dark-mode-first design for v1. The audience is marketing directors, not developers. Light mode, professional.
- No "Try our AI-powered scan" language. Say what it does, not how.
- No gamification patterns (streaks, badges, leaderboards beyond the curated benchmark posts). This is a professional tool, not a consumer app.
- No generic SaaS hero illustrations (abstract people, floating dashboards, flying arrows). If we use imagery, it's screenshots of the actual tool output.
- No emoji in product UI or PDF. Emoji in blog and LinkedIn posts are fine at Performance Peak's discretion.

---

## 7. Implementation notes for Claude Code

When building the UI in sprint 4 and onwards, import tokens from a single source of truth:

```ts
// packages/ui/src/tokens.ts
export const colors = {
  navy: '#0B1F3A',
  signalBlue: '#2F6BDB',
  signalGreen: '#1A9F5D',
  signalAmber: '#D97706',
  signalRed: '#C73030',
  slate900: '#0F172A',
  slate500: '#64748B',
  slate100: '#F1F5F9',
} as const;

export const scoreBands = {
  85: { band: 'AI-Ready Leader', color: colors.signalGreen },
  70: { band: 'Solid foundation', color: colors.signalGreen },
  55: { band: 'Partial readiness', color: colors.signalAmber },
  35: { band: 'Significant gaps', color: colors.signalAmber },
  0:  { band: 'High risk', color: colors.signalRed },
} as const;
```

Tailwind config should extend with these brand tokens so utility classes like `bg-navy`, `text-signal-red`, `border-slate-100` are available across every component.

The score gauge should be a single reusable component in `packages/ui/src/ScoreGauge.tsx` — one source of truth that renders identically in the web app, PDF (via React-PDF), and OG images (via Next.js `ImageResponse`). If it's duplicated across surfaces, subtle rendering drift will creep in.
