# PromptScore — Project Spec

**A Performance Peak product.**
Full spec and 10-sprint build plan, ready to drive Claude Code in VS Code.

Domain: **promptscore.co.uk**

## Start here

1. **[`00-project-spec.md`](./00-project-spec.md)** — executive summary, architecture, data model, repository layout. Read this first.
2. **[`01-scoring-model.md`](./01-scoring-model.md)** — single source of truth for every check, weight, and rubric. Referenced by every sprint.
3. **[`02-brand-identity.md`](./02-brand-identity.md)** — brand guidance for UI, copy, and PDF. Reference in sprint 4 onwards.
4. **[`sprints/`](./sprints/)** — one file per sprint, each with tasks and acceptance tests.

## Sprint index

| # | File | Goal |
|---|---|---|
| 1 | [`sprints/sprint-01-foundation.md`](./sprints/sprint-01-foundation.md) | Foundation & infrastructure |
| 2 | [`sprints/sprint-02-fetch-parse.md`](./sprints/sprint-02-fetch-parse.md) | Deterministic fetch & parse layer |
| 3 | [`sprints/sprint-03-deterministic-scoring.md`](./sprints/sprint-03-deterministic-scoring.md) | Deterministic scoring engine |
| 4 | [`sprints/sprint-04-ai-checks-mvp.md`](./sprints/sprint-04-ai-checks-mvp.md) | AI-graded checks + **public MVP live** |
| 5 | [`sprints/sprint-05-email-gate-pdf.md`](./sprints/sprint-05-email-gate-pdf.md) | Email gate, detailed report, PDF |
| 6 | [`sprints/sprint-06-admin-dashboard.md`](./sprints/sprint-06-admin-dashboard.md) | Admin dashboard |
| 7 | [`sprints/sprint-07-benchmark-mode.md`](./sprints/sprint-07-benchmark-mode.md) | Benchmark mode |
| 8 | [`sprints/sprint-08-polish-hardening.md`](./sprints/sprint-08-polish-hardening.md) | Polish, performance, abuse controls |
| 9 | [`sprints/sprint-09-marketing-launch.md`](./sprints/sprint-09-marketing-launch.md) | Marketing launch assets |
| 10 | [`sprints/sprint-10-v2-foundations.md`](./sprints/sprint-10-v2-foundations.md) | V2 foundations & historical tracking |

## How to drive Claude Code with this spec

At the start of each sprint, open a fresh Claude Code session and point it at the sprint file plus the scoring model (and from sprint 4 onwards, the brand identity). A good opening prompt:

> Read `sprints/sprint-02-fetch-parse.md` and `01-scoring-model.md`. Implement task S2.1 first. After each task, run the acceptance tests and confirm they pass before moving on. Stop after each task and wait for me to review.

For sprints that involve user-facing UI or copy (4, 5, 6, 7, 9), also include `02-brand-identity.md` in the opening prompt.

Each task is sized for one focused Claude Code session. Every sprint ends with a tagged git release (`v0.1.0` through `v1.0.0`).

## Repeatability — the one thing that matters most

The tool's credibility depends on returning the same score for the same URL on repeated scans. Three mechanisms enforce this:

1. **30-day result cache** keyed by normalised URL + content hash.
2. **Locked AI prompts at temperature 0** with versioned prompt IDs.
3. **Explicit re-check** that invalidates cache and preserves history.

If any change to the spec risks breaking repeatability, flag it before implementing.

## Timeline

- **Sprint 1–4 (first 4 weeks):** public MVP live.
- **Sprint 5–6 (weeks 5–6):** freemium product with PDF + admin.
- **Sprint 7–10 (weeks 7–10):** benchmark, hardening, launch, v2 foundations.

## Open questions

Logged at the end of `00-project-spec.md` §8. Resolve before the sprint that depends on them.
