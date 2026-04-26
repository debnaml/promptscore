import type { Check } from "../types";
import { scored, notScored } from "../types";

const RETRIEVAL_BOTS = [
  "OAI-SearchBot",
  "ChatGPT-User",
  "PerplexityBot",
  "Perplexity-User",
  "Claude-SearchBot",
];

const TRAINING_BOTS = ["GPTBot", "ClaudeBot", "Google-Extended", "CCBot"];

export const crawlerAccessChecks: Check[] = [
  {
    key: "robots_valid",
    category: "crawler_access",
    type: "D",
    weight: 2,
    run(ctx) {
      const raw = ctx.robots.raw;
      if (!raw) return scored(0, { present: false }, "robots.txt missing");
      return scored(1, { present: true }, "robots.txt present and valid");
    },
  },

  {
    key: "retrieval_bots_allowed",
    category: "crawler_access",
    type: "D",
    weight: 5,
    run(ctx) {
      const allowed = RETRIEVAL_BOTS.filter((bot) =>
        ctx.robots.isAllowed(bot, "/")
      );
      const blocked = RETRIEVAL_BOTS.filter(
        (bot) => !ctx.robots.isAllowed(bot, "/")
      );
      const score =
        blocked.length === 0 ? 1 : allowed.length === 0 ? 0 : 0.5;
      return scored(score, { allowed, blocked });
    },
  },

  {
    key: "training_bots_explicit",
    category: "crawler_access",
    type: "D",
    weight: 3,
    run(ctx) {
      const explicit = TRAINING_BOTS.filter((bot) =>
        ctx.robots.hasExplicitRuleFor(bot)
      );
      const silent = TRAINING_BOTS.filter(
        (bot) => !ctx.robots.hasExplicitRuleFor(bot)
      );
      const score =
        silent.length === 0 ? 1 : explicit.length === 0 ? 0 : 0.5;
      return scored(score, { explicit, silent });
    },
  },

  {
    key: "sitemap_present_linked",
    category: "crawler_access",
    type: "D",
    weight: 2,
    run(ctx) {
      const present = ctx.sitemap.present;
      if (!present) return scored(0, { present }, "No sitemap found");
      const linked = ctx.robots.sitemapUrls().length > 0;
      const score = linked ? 1 : 0.5;
      return scored(score, { present, linked, sitemapUrls: ctx.robots.sitemapUrls() });
    },
  },

  {
    key: "https_hsts",
    category: "crawler_access",
    type: "D",
    weight: 2,
    run(ctx) {
      const isHttps = ctx.input.canonical.startsWith("https://");
      if (!isHttps) return scored(0, { https: false, hsts: false }, "Not HTTPS");
      const hsts = ctx.homepage.meta.strictTransportSecurity !== null;
      const score = hsts ? 1 : 0.5;
      return scored(score, {
        https: true,
        hsts,
        hsts_value: ctx.homepage.meta.strictTransportSecurity,
      });
    },
  },

  {
    key: "js_dependency_ratio",
    category: "crawler_access",
    type: "DC",
    weight: 5,
    run(ctx) {
      // Without Playwright (S2.6 deferred), we skip this check
      return notScored("Playwright render worker deferred — cannot compare static vs rendered", {
        static_word_count: ctx.homepage.semantic.wordCount,
      });
    },
  },

  {
    key: "pagespeed_mobile",
    category: "crawler_access",
    type: "DC",
    weight: 1,
    run(ctx) {
      const psi = (ctx as unknown as { pagespeed?: { mobile?: number } }).pagespeed;
      if (!psi?.mobile) {
        return notScored("PageSpeed result not available — will be fetched separately");
      }
      const s = psi.mobile;
      const score = s >= 75 ? 1 : s >= 50 ? 0.5 : 0;
      return scored(score, { mobile_score: s });
    },
  },
];
