import type { Check } from "../types";
import { scored, notScored } from "../types";

const RETRIEVAL_BOTS = ["OAI-SearchBot", "ChatGPT-User", "PerplexityBot", "Perplexity-User", "Claude-SearchBot"];
const TRAINING_BOTS = ["GPTBot", "ClaudeBot", "Google-Extended", "CCBot"];

export const aiSpecificChecks: Check[] = [
  {
    key: "llms_txt_present",
    category: "ai_specific",
    type: "D",
    weight: 3,
    run(ctx) {
      const { present, valid } = ctx.llmsTxt;
      if (!present) return scored(0, { present, valid }, "llms.txt not found");
      const score = valid ? 1 : 0.5;
      return scored(score, { present, valid, errors: ctx.llmsTxt.errors });
    },
  },

  {
    key: "llms_full_txt",
    category: "ai_specific",
    type: "D",
    weight: 1,
    run(ctx) {
      const hasFullVersion = ctx.llmsTxt.fullRaw !== null;
      return scored(hasFullVersion ? 1 : 0, { present: hasFullVersion });
    },
  },

  {
    key: "retrieval_vs_training_differentiated",
    category: "ai_specific",
    type: "D",
    weight: 4,
    run(ctx) {
      // Check: does site have distinct rules for retrieval bots vs training bots?
      const retrievalExplicit = RETRIEVAL_BOTS.filter((b) => ctx.robots.hasExplicitRuleFor(b));
      const trainingExplicit = TRAINING_BOTS.filter((b) => ctx.robots.hasExplicitRuleFor(b));

      // Full credit: explicit rules for both retrieval AND training bots,
      // and at least one retrieval bot allowed while training stance explicit
      const hasRetrievalRules = retrievalExplicit.length >= 2;
      const hasTrainingRules = trainingExplicit.length >= 2;
      const retrievalAllowed = RETRIEVAL_BOTS.some((b) => ctx.robots.hasExplicitRuleFor(b) && ctx.robots.isAllowed(b, "/"));
      const trainingDifferent = TRAINING_BOTS.some((b) => ctx.robots.hasExplicitRuleFor(b));

      let score: number;
      if (hasRetrievalRules && hasTrainingRules && retrievalAllowed) {
        score = 1;
      } else if (retrievalExplicit.length > 0 || trainingExplicit.length > 0) {
        score = 0.5;
      } else {
        score = 0;
      }

      return scored(score, {
        retrieval_explicit: retrievalExplicit,
        training_explicit: trainingExplicit,
        retrieval_allowed: retrievalAllowed,
        training_different: trainingDifferent,
      });
    },
  },

  {
    key: "waf_not_blocking_ai_bots",
    category: "ai_specific",
    type: "DC",
    weight: 4,
    run(ctx) {
      const probes = ctx.botProbes;
      const keys = Object.keys(probes);
      if (keys.length === 0) {
        return notScored("Bot probes not yet run — will be populated in scan pipeline");
      }
      const retrievalProbes = RETRIEVAL_BOTS.filter((b) => probes[b]);
      const blocked = retrievalProbes.filter((b) => probes[b]?.blocked);
      const allowed = retrievalProbes.filter((b) => !probes[b]?.blocked);
      const score = blocked.length === 0 ? 1 : allowed.length === 0 ? 0 : 0.5;
      return scored(score, { probes, retrieval_blocked: blocked, retrieval_allowed: allowed });
    },
  },

  {
    key: "ai_policy_page",
    category: "ai_specific",
    type: "D",
    weight: 2,
    run(ctx) {
      // Signal 1: dedicated ai.txt file at root
      if (ctx.aiTxt?.present) {
        return scored(1, { method: "ai.txt", found: true }, "ai.txt found at site root");
      }

      const allHtmlSources = [
        ctx.homepage.static.ok ? (ctx.homepage.static as { html: string }).html : "",
        ...ctx.innerPages.map((p) => (p.static.ok ? (p.static as { html: string }).html : "")),
      ];

      // Signal 2: href containing AI policy related path keywords (any extension/query/hash)
      const hrefKeywords = [
        "ai-policy", "ai-disclosure", "ai-transparency", "ai-stance",
        "ai-usage", "ai-commitment", "ai-principles", "ai-approach",
        "ai-ethics", "ai-guidelines", "artificial-intelligence-policy",
      ];
      const hrefKeywordRe = new RegExp(
        `href=["'][^"']*(${hrefKeywords.join("|")})[^"']*["']`,
        "i"
      );
      // Also catch bare /ai path segment (not just /aim, /air etc.)
      const hrefAiPathRe = /href=["'][^"']*\/ai(\.html?|\.txt|\/[^"']*|[?#"'])/i;

      // Signal 3: anchor link text mentioning AI policy
      const linkTextRe = /<a\b[^>]*>[^<]*(ai\s+policy|ai\s+disclosure|ai\s+transparency|ai\s+stance|ai\s+ethics|artificial\s+intelligence\s+policy)[^<]*<\/a>/i;

      for (const html of allHtmlSources) {
        if (!html) continue;
        if (hrefKeywordRe.test(html)) {
          return scored(1, { method: "href_keyword", found: true });
        }
        if (hrefAiPathRe.test(html)) {
          return scored(1, { method: "href_ai_path", found: true });
        }
        if (linkTextRe.test(html)) {
          return scored(1, { method: "link_text", found: true });
        }
      }

      return scored(0, { found: false });
    },
  },

  {
    key: "tdm_headers",
    category: "ai_specific",
    type: "D",
    weight: 1,
    run(ctx) {
      const xRobots = ctx.homepage.meta.xRobotsTag ?? "";
      // TDM reservation: X-Robots-Tag with tdm-reservation or tdm-policy, or noai/noimageai
      const hasTdm = /tdm-reservation|tdm-policy|noai|noimageai/i.test(xRobots);
      // Also check meta robots tag in HTML
      const metaRobots = ctx.homepage.meta.robots ?? "";
      const hasTdmMeta = /tdm-reservation|tdm-policy|noai|noimageai/i.test(metaRobots);
      const found = hasTdm || hasTdmMeta;
      return scored(found ? 1 : 0, {
        x_robots_tag: xRobots || null,
        meta_robots: metaRobots || null,
        tdm_found: found,
      });
    },
  },
];
