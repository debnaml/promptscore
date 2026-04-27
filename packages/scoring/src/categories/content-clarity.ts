import type { Check } from "../types";
import { scored, notScored } from "../types";
import type { HeadingEntry } from "@promptscore/fetch";
import {
  scoreHomepageClarity,
  normaliseHomepageClarity,
  scoreQueryCoverage,
  normaliseQueryCoverage,
} from "@promptscore/ai";

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
      // Tiered: all 4 core landmarks = 1.0, 3 of 4 = 0.75, 2 of 4 = 0.5, otherwise 0
      let score: number;
      if (present.length === 4) score = 1;
      else if (present.length === 3) score = 0.75;
      else if (present.length === 2) score = 0.5;
      else score = 0;
      const notes = missing.length > 0
        ? `Missing landmarks: ${missing.map((m) => `<${m}>`).join(", ")}`
        : undefined;
      return scored(score, { landmarks: lm, present, missing }, notes);
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
      let decorative = 0;
      for (const page of pages) {
        total += page.semantic.images.total;
        withAlt += page.semantic.images.withAlt;
        decorative += page.semantic.images.decorativeEmptyAlt;
      }
      // alt="" is the CORRECT way to mark decorative images — exclude from denominator
      const contentImages = total - decorative;
      if (contentImages === 0) return scored(1, { total, decorative, note: "No content images found — full credit" });
      const ratio = withAlt / contentImages;
      const score = ratio >= 0.9 ? 1 : ratio >= 0.6 ? 0.5 : 0;
      return scored(score, { total, with_alt: withAlt, decorative_empty_alt: decorative, content_images: contentImages, ratio: Math.round(ratio * 100) / 100 });
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
        // Deep-traverse JSON-LD blocks to handle @graph nesting (Yoast, RankMath, etc.)
        const schemaDatePub = page.jsonLd.blocks.some((b) => hasFieldDeep(b.parsed, "datePublished"));
        const schemaDateMod = page.jsonLd.blocks.some((b) => hasFieldDeep(b.parsed, "dateModified"));
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
    async run(ctx) {
      const html = ctx.homepage.static.ok ? (ctx.homepage.static as { html: string }).html : "";
      const title = ctx.homepage.meta.og?.title ?? extractTitle(html);
      const description = ctx.homepage.meta.description ?? "";
      const h1 = ctx.homepage.semantic.headings.find((h) => h.level === 1)?.text ?? "";
      const mainContent = extractMainText(html, 500);

      const result = await scoreHomepageClarity({ title, description, h1, mainContent });
      if (!result.ok) return notScored(result.reason, { skipped: true });

      const score = normaliseHomepageClarity(result.data);
      return scored(score, {
        rubric: result.data,
        tokens_used: result.tokensUsed,
        prompt_version: result.promptVersion,
      });
    },
  },

  {
    key: "query_coverage_rubric",
    category: "content_clarity",
    type: "A",
    weight: 6,
    async run(ctx) {
      const detectedCategory =
        (ctx as unknown as { detectedCategory?: string }).detectedCategory ?? "other";
      const location =
        (ctx as unknown as { detectedLocation?: string }).detectedLocation ?? null;

      // Assemble content from homepage + inner pages (up to 4000 words)
      const pages = [ctx.homepage, ...ctx.innerPages.slice(0, 3)];
      const content = pages
        .map((p) => (p.static.ok ? (p.static as { html: string }).html : ""))
        .map((h) => extractMainText(h, 1200))
        .join("\n\n")
        .slice(0, 4000 * 6); // rough char cap

      const result = await scoreQueryCoverage({ category: detectedCategory, location, content });
      if (!result.ok) return notScored(result.reason, { skipped: true });

      const score = normaliseQueryCoverage(result.data);
      return scored(score, {
        queries: result.data.queries,
        tokens_used: result.tokensUsed,
        prompt_version: result.promptVersion,
      });
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

function extractTitle(html: string): string {
  return /<title[^>]*>([^<]*)<\/title>/i.exec(html)?.[1]?.trim() ?? "";
}

/** Recursively search a parsed JSON-LD value for a top-level field on any node.
 * Handles @graph arrays and arbitrary nesting. Returns true if any node has the field as a string. */
function hasFieldDeep(value: unknown, field: string): boolean {
  if (value === null || value === undefined) return false;
  if (Array.isArray(value)) {
    return value.some((v) => hasFieldDeep(v, field));
  }
  if (typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  if (typeof record[field] === "string") return true;
  // Recurse into @graph and other array/object children
  if (Array.isArray(record["@graph"])) {
    if (record["@graph"].some((v) => hasFieldDeep(v, field))) return true;
  }
  return false;
}

/** Extract visible text from main content, strip tags, cap at wordLimit words */
function extractMainText(html: string, wordLimit: number): string {
  if (!html) return "";
  // Remove script/style/head
  const clean = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<head[\s\S]*?<\/head>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return clean.split(/\s+/).slice(0, wordLimit).join(" ");
}
