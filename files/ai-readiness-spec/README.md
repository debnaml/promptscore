# PromptScore — Project Spec

**A Performance Peak product.**
Full spec, ready to drive Claude Code in VS Code.

Domain: **promptscore.co.uk**

## Start here

1. **[`00-project-spec.md`](./00-project-spec.md)** — executive summary, architecture, data model, repository layout. Read this first.
2. **[`01-scoring-model.md`](./01-scoring-model.md)** — single source of truth for every check, weight, and rubric. Referenced by every sprint.
3. **[`02-brand-identity.md`](./02-brand-identity.md)** — brand guidance for UI, copy, and PDF. Reference in sprint 4 onwards.
4. **[`sprints/`](./sprints/)** — one file per sprint, each with tasks and acceptance tests.

## Sprint plan

The original 10-sprint build (S1–S10) took us from nothing to a working public scanner with admin tools and benchmark mode. Sprints 1–7 are complete; the original plans for S8–S10 have been resliced into 10 smaller "Sprint Extras" (SE1–SE10) that finish the product, polish the brand, dogfood our own AI search readiness, and ship v1.0.

The original sprint files are archived at [`sprints/archive/`](./sprints/archive/) — see that folder's README for the mapping from old to new.

### Active sprint index — Sprint Extras

| # | File | Goal | Tag |
|---|---|---|---|
| SE1 | [`sprints/se-01-public-polish.md`](./sprints/se-01-public-polish.md) | Public site polish (homepage, result, OG, header/footer) | `v0.7.1` |
| SE2 | [`sprints/se-02-self-readiness.md`](./sprints/se-02-self-readiness.md) | Self-SEO + AI search readiness — promptscore scores ≥95 on its own scanner | `v0.7.2` |
| SE3 | [`sprints/se-03-methodology.md`](./sprints/se-03-methodology.md) | Public `/methodology` page with full rubric and FAQPage schema | `v0.7.3` |
| SE4 | [`sprints/se-04-error-hardening.md`](./sprints/se-04-error-hardening.md) | Graceful errors + external-call timeouts + stuck-scan cleanup | `v0.7.4` |
| SE5 | [`sprints/se-05-a11y-analytics.md`](./sprints/se-05-a11y-analytics.md) | WCAG 2.2 AA + privacy-respecting analytics + `/admin/funnel` | `v0.7.5` |
| SE6 | [`sprints/se-06-launch-content.md`](./sprints/se-06-launch-content.md) | Launch content pack — LinkedIn carousel feature, blog post #1, demo video | `v0.8.0` |
| SE7 | [`sprints/se-07-sales-enablement.md`](./sprints/se-07-sales-enablement.md) | Sales emails, cold templates, lead-detail "copy email", playbook | `v0.8.1` |
| SE8 | [`sprints/se-08-badge-archive.md`](./sprints/se-08-badge-archive.md) | Embed badge for ≥85 + public benchmark archive | `v0.8.2` |
| SE9 | [`sprints/se-09-v2-foundations.md`](./sprints/se-09-v2-foundations.md) | History tracking, public competitor comparison, scheduled re-scans | `v0.9.0` |
| SE10 | [`sprints/se-10-v1-release.md`](./sprints/se-10-v1-release.md) | Sentry, Turnstile, blocklist, load tests, paid-tier decision, v1.0.0 | `v1.0.0` |
| SE11 | [`sprints/se-11-playwright-worker.md`](./sprints/se-11-playwright-worker.md) | Playwright render worker on Fly.io — fixes `js_dependency_ratio` + JS-heavy SPA scoring | `v0.7.6` |
| SE12 | [`sprints/se-12-admin-ops-completions.md`](./sprints/se-12-admin-ops-completions.md) | Deferred admin/ops items: audit log UI, retry UI, queue position, GDPR deletion, log drain, uptime monitor, benchmark scheduling | `v0.7.7` |

## How to drive Claude Code with this spec

At the start of each sprint, open a fresh Claude Code session and point it at the sprint file plus the scoring model (and from sprint 4 onwards, the brand identity). A good opening prompt:

> Read `sprints/sprint-02-fetch-parse.md` and `01-scoring-model.md`. Implement task S2.1 first. After each task, run the acceptance tests and confirm they pass before moving on. Stop after each task and wait for me to review.

For sprints that involve user-facing UI or copy (most SE sprints do), also include `02-brand-identity.md` in the opening prompt.

Each task is sized for one focused Claude Code session. Every sprint ends with a tagged git release.

### Completed sprints

S1–S7 are complete and tagged. Their plans live at [`sprints/archive/`](./sprints/archive/).

| # | Status |
|---|---|
| 1 | ✅ Foundation |
| 2 | ✅ Fetch & parse |
| 3 | ✅ Deterministic scoring |
| 4 | ✅ AI checks + MVP live |
| 5 | ✅ Email gate + PDF |
| 6 | ✅ Admin dashboard |
| 7 | ✅ Benchmark mode (S7.6 LinkedIn → SE6, S7.8 archive → SE8) |
| 8 | ⚠️ Resliced into SE4 / SE5 / SE10 |
| 9 | ⚠️ Resliced into SE3 / SE6 / SE7 / SE8 |
| 10 | ⚠️ Resliced into SE9 / SE10 |

## Repeatability — the one thing that matters most

The tool's credibility depends on returning the same score for the same URL on repeated scans. Three mechanisms enforce this:

1. **30-day result cache** keyed by normalised URL + content hash.
2. **Locked AI prompts at temperature 0** with versioned prompt IDs.
3. **Explicit re-check** that invalidates cache and preserves history.

If any change to the spec risks breaking repeatability, flag it before implementing.

## Timeline

- **S1–S7 (complete):** working public MVP with admin tools, PDF reports, and benchmark mode.
- **SE1–SE3:** brand polish + own AI search readiness + public methodology page.
- **SE4–SE5:** resilience, accessibility, analytics — launch-ready foundations.
- **SE6–SE8:** launch content, sales enablement, embed badge + benchmark archive.
- **SE9–SE10:** historical tracking, scheduled re-scans, hardening, paid-tier decision, v1.0.0.

## Open questions

Logged at the end of `00-project-spec.md` §8. Resolve before the sprint that depends on them.
