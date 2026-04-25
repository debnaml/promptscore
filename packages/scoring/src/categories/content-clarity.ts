import type { Check } from "../types";
import { scored, notScored } from "../types";
import type { HeadingEntry } from "@promptscore/fetch";

export const contentClarityChecks: Check[] = [
  {
    key: "heading_hierarchy",
    category: "content_clarity",
    type: "D",
    weight: 3,
    run(ctx) {
      const pages = [ctx.homepage, ...ctx.innerPages];
      const issues: string[] = [];

      for (const page of pages) {
        const headings = page.semantic.headings;
        const h1s = headings.filter((h) => h.level === 1);
        if (h1s.length === 0) issues.push(`${page.url}: no H1`);
        if (h1s.length > 1) issues.push(`${page.url}: multiple H1s (${h1s.length})`);
        const skipped = findSkippedLevels(headings);
        if (skipped.length > 0) issues.push(`${page.url}: skipped levels ${skipped.join(", ")}`);
      }

      const score = issues.length === 0 ? 1 : issues.length <= 2 ? 0.5 : 0;
      return scored(score, { issues, pages_checked: pages.length });
    },
  },

  {
    key: "semantic_landmarks",
    category: "content_clarity",
    type: "D",
    weight: 2,
    run(ctx) {
      const lm = ctx.homepage.semantic.landmarks;
      const required = ["main", "nav", "header", "footer"] as const;
      const present = required.filter((k) => lm[k] > 0);
      const missing = required.filter((k) => lm[k] === 0);
      // Full credit: main, article|section, nav, header, footer all present
      const hasArticleOrSection = lm.article > 0 || lm.section > 0;
      const allPresent = present.length === 4 && hasArticleOrSection;
      const score = allPresent ? 1 : present.length >= 2 ? 0.5 : 0;
      return scored(score, { landmarks: lm, present, missing });
    },
  },

  {
    key: "alt_text_coverage",
    category: "content_clarity",
    type: "DC",
    weight: 2,
    run(ctx) {
      const pages = [ctx.homepage, ...ctx.innerPages];
      let total = 0;
      let withAlt = 0;
      for (const page of pages) {
        total += page.semantic.images.total;
        withAlt += page.semantic.images.withAlt;
      }
      if (total === 0) return scored(1, { total: 0, note: "No images found — full credit" });
      const ratio = withAlt / total;
      const score = ratio >= 0.9 ? 1 : ratio >= 0.6 ? 0.5 : 0;
      return scored(score, { total, with_alt: withAlt, ratio: Math.round(ratio * 100) / 100 });
    },
  },

  {
    key: "publication_dates",
    category: "content_clarity",
    type: "DC",
    weight: 2,
    run(ctx) {
      const pages = ctx.innerPages.length > 0 ? ctx.innerPages : [ctx.homepage];
      let pagesWithBoth = 0;
      let pagesWithOne = 0;

      for (const page of pages) {
        const html = page.static.ok ? (page.static as { html: string }).html : "";
        const schemaDatePub = page.jsonLd.blocks.some((b) => {
          const p = b.parsed as Record<string, unknown>;
          return typeof p.datePublished === "string";
        });
        const schemaDateMod = page.jsonLd.blocks.some((b) => {
          const p = b.parsed as Record<string, unknown>;
          return typeof p.dateModified === "string";
        });
        const hasTimeEl = /<time[^>]+datetime/i.test(html);
        const hasDate = schemaDatePub || hasTimeEl;
        const hasUpdated = schemaDateMod;

        if (hasDate && hasUpdated) pagesWithBoth++;
        else if (hasDate || hasUpdated) pagesWithOne++;
      }

      const ratio = (pagesWithBoth + 0.5 * pagesWithOne) / pages.length;
      const score = ratio >= 0.8 ? 1 : ratio >= 0.4 ? 0.5 : 0;
      return scored(score, { pages_checked: pages.length, with_both: pagesWithBoth, with_one: pagesWithOne });
    },
  },

  {
    key: "homepage_clarity_rubric",
    category: "content_clarity",
    type: "A",
    weight: 6,
    run(_ctx) {
      // AI check — deferred to Sprint 4
      return notScored("AI-graded check deferred to Sprint 4");
    },
  },

  {
    key: "query_coverage_rubric",
    category: "content_clarity",
    type: "A",
    weight: 6,
    run(_ctx) {
      return notScored("AI-graded check deferred to Sprint 4");
    },
  },

  {
    key: "faq_content_present",
    category: "content_clarity",
    type: "D",
    weight: 2,
    run(ctx) {
      const html = ctx.homepage.static.ok ? (ctx.homepage.static as { html: string }).html : "";
      const present = hasFaqPattern(html, ctx.homepage.semantic.headings);
      return scored(present ? 1 : 0, { detected: present });
    },
  },

  {
    key: "content_depth_linking",
    category: "content_clarity",
    type: "DC",
    weight: 2,
    run(ctx) {
      const pages = ctx.innerPages.length > 0 ? ctx.innerPages : [ctx.homepage];
      const avgWords = pages.reduce((s, p) => s + p.semantic.wordCount, 0) / pages.length;
      const avgLinks = pages.reduce((s, p) => s + p.semantic.internalLinks, 0) / pages.length;
      const deepEnough = avgWords >= 500;
      const wellLinked = avgLinks >= 5;
      const score = deepEnough && wellLinked ? 1 : deepEnough || wellLinked ? 0.5 : 0;
      return scored(score, { avg_word_count: Math.round(avgWords), avg_internal_links: Math.round(avgLinks) });
    },
  },
];

function findSkippedLevels(headings: HeadingEntry[]): string[] {
  const skipped: string[] = [];
  let prevLevel = 0;
  for (const h of headings) {
    if (prevLevel > 0 && h.level > prevLevel + 1) {
      skipped.push(`H${prevLevel}→H${h.level}`);
    }
    prevLevel = h.level;
  }
  return skipped;
}

function hasFaqPattern(html: string, headings: HeadingEntry[]): boolean {
  if (!html) return false;
  if (/(<details[\s>]|<summary[\s>])/i.test(html)) return true;
  if (headings.some((h) => /^(FAQ|Frequently Asked|Questions)/i.test(h.text))) return true;
  const questionHeadings = headings.filter((h) => (h.level === 3 || h.level === 4) && h.text.endsWith("?"));
  return questionHeadings.length >= 2;
}
