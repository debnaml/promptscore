import type { Check } from "../types";
import { scored, notScored } from "../types";
import { scoreCitationPractice } from "@promptscore/ai";

const ABOUT_PATHS = ["/about", "/about-us", "/company", "/who-we-are"];
const CONTACT_PATHS = ["/contact", "/contact-us", "/get-in-touch"];

export const authorityTrustChecks: Check[] = [
  {
    key: "about_page_substantive",
    category: "authority_trust",
    type: "DC",
    weight: 2,
    run(ctx) {
      const aboutPage = ctx.innerPages.find((p) => {
        try {
          const path = new URL(p.url).pathname.toLowerCase();
          return ABOUT_PATHS.some((ap) => path.startsWith(ap));
        } catch { return false; }
      });
      if (!aboutPage) return scored(0, { found: false }, "No about page found in sampled pages");
      const words = aboutPage.semantic.wordCount;
      const score = words >= 300 ? 1 : words > 0 ? 0.5 : 0;
      return scored(score, { url: aboutPage.url, word_count: words });
    },
  },

  {
    key: "contact_info_complete",
    category: "authority_trust",
    type: "D",
    weight: 2,
    run(ctx) {
      const html = ctx.homepage.static.ok ? (ctx.homepage.static as { html: string }).html : "";
      const hasPhone = /tel:|(\+\d[\d\s\-().]{6,})|(\(\d{3}\)\s?\d{3}[-.\s]?\d{4})/i.test(html);
      const hasEmail = /mailto:|[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/i.test(html);
      // Address: look for schema ContactPoint or common address patterns
      const hasAddress = /itemprop=["']address["']|<address[\s>]|contactpoint|streetAddress/i.test(html);
      const found = { phone: hasPhone, email: hasEmail, address: hasAddress };
      const count = Object.values(found).filter(Boolean).length;
      const score = count === 3 ? 1 : count >= 1 ? 0.5 : 0;
      return scored(score, found);
    },
  },

  {
    key: "author_bylines",
    category: "authority_trust",
    type: "DC",
    weight: 2,
    run(ctx) {
      if (ctx.innerPages.length === 0) {
        return scored(0.5, { pages_checked: 0, note: "No inner pages sampled — cannot evaluate" });
      }
      let withAuthor = 0;
      let withBio = 0;
      for (const page of ctx.innerPages) {
        const html = page.static.ok ? (page.static as { html: string }).html : "";
        const hasAuthor = /itemprop=["']author["']|rel=["']author["']|class=["'][^"']*author[^"']*["']|"@type"\s*:\s*"Person"/i.test(html);
        const hasBio = /itemprop=["']description["'][^>]*>|class=["'][^"']*bio[^"']*["']|author-bio/i.test(html);
        if (hasAuthor) {
          withAuthor++;
          if (hasBio) withBio++;
        }
      }
      const score = withBio > 0 ? 1 : withAuthor > 0 ? 0.5 : 0;
      return scored(score, { pages_checked: ctx.innerPages.length, with_author: withAuthor, with_bio: withBio });
    },
  },

  {
    key: "wikidata_presence",
    category: "authority_trust",
    type: "D",
    weight: 3,
    run(ctx) {
      const wikidata = (ctx as unknown as { wikidataResult?: { score: number; entity?: string; ambiguous?: boolean } }).wikidataResult;
      if (!wikidata) {
        return notScored("Wikidata lookup not yet run — will be fetched in scan pipeline");
      }
      return scored(wikidata.score, { entity: wikidata.entity, ambiguous: wikidata.ambiguous });
    },
  },

  {
    key: "sameas_links",
    category: "authority_trust",
    type: "D",
    weight: 2,
    run(ctx) {
      const sameAs = ctx.homepage.jsonLd.organization?.sameAs ?? [];
      const count = sameAs.length;
      const score = count >= 3 ? 1 : count >= 1 ? 0.5 : 0;
      return scored(score, { same_as: sameAs, count });
    },
  },

  {
    key: "citation_practice",
    category: "authority_trust",
    type: "A",
    weight: 2,
    async run(ctx) {
      const pages = ctx.innerPages.length > 0 ? ctx.innerPages.slice(0, 3) : [ctx.homepage];
      const pageInputs = pages
        .filter((p) => p.static.ok)
        .map((p) => ({
          url: p.url,
          content: (p.static as { html: string }).html,
        }));

      if (pageInputs.length === 0) return notScored("No page content available");

      const result = await scoreCitationPractice({ pages: pageInputs });
      if (!result.ok) return notScored(result.reason, { skipped: true });

      return scored(result.data.overall, {
        pages: result.data.pages,
        tokens_used: result.tokensUsed,
        prompt_version: result.promptVersion,
      });
    },
  },

  {
    key: "brand_consistency",
    category: "authority_trust",
    type: "D",
    weight: 2,
    run(ctx) {
      const orgName = ctx.homepage.jsonLd.organization?.name ?? null;
      const titleText = extractTitleText(ctx.homepage.static.ok ? (ctx.homepage.static as { html: string }).html : "");
      const logoAlt = extractLogoAlt(ctx.homepage.static.ok ? (ctx.homepage.static as { html: string }).html : "");

      const candidates = [orgName, titleText, logoAlt].filter((s): s is string => !!s);
      if (candidates.length < 2) {
        return scored(0.5, { org_name: orgName, title: titleText, logo_alt: logoAlt, note: "Insufficient data for comparison" });
      }

      const normalise = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "").trim();
      const base = normalise(candidates[0]);
      const consistent = candidates.every((c) => {
        const n = normalise(c);
        return n.includes(base) || base.includes(n) || levenshtein(n, base) <= 3;
      });

      return scored(consistent ? 1 : 0.5, { org_name: orgName, title: titleText, logo_alt: logoAlt });
    },
  },
];

function extractTitleText(html: string): string | null {
  const m = /<title[^>]*>([^<]*)<\/title>/i.exec(html);
  return m ? m[1].trim() : null;
}

function extractLogoAlt(html: string): string | null {
  const m = /class=["'][^"']*logo[^"']*["'][^>]*>[\s\S]*?<img[^>]+alt=["']([^"']+)["']/i.exec(html)
    ?? /<img[^>]+class=["'][^"']*logo[^"']*["'][^>]*alt=["']([^"']+)["']/i.exec(html)
    ?? /<img[^>]+alt=["']([^"']*logo[^"']*)["']/i.exec(html);
  return m ? m[1].trim() : null;
}

function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, (_, i) => [i, ...Array(n).fill(0)]);
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}
