import type { Check } from "../types";
import { scored } from "../types";

type DetectedCategory =
  | "hospitality-luxury"
  | "hospitality-budget"
  | "legal"
  | "ecommerce"
  | "saas"
  | "editorial"
  | "local-services"
  | "other";

const CATEGORY_SCHEMA_EXPECTATIONS: Record<DetectedCategory, string[]> = {
  "hospitality-luxury": ["Hotel", "LodgingBusiness", "Resort"],
  "hospitality-budget": ["Hotel", "LodgingBusiness"],
  legal: ["LegalService", "Attorney"],
  ecommerce: ["Product", "Offer", "AggregateRating"],
  saas: ["SoftwareApplication", "Product"],
  editorial: ["Article", "NewsArticle", "BlogPosting"],
  "local-services": ["LocalBusiness", "ProfessionalService", "Service", "FinancialService", "AccountingService", "LegalService", "HomeAndConstructionBusiness", "HealthAndBeautyBusiness", "FoodEstablishment"],
  other: [],
};

export const structuredDataChecks: Check[] = [
  {
    key: "schema_organization",
    category: "structured_data",
    type: "D",
    weight: 5,
    run(ctx) {
      const org = ctx.homepage.jsonLd.organization;
      if (!org) return scored(0, { organization: null }, "No Organization schema found");
      const fields = { name: !!org.name, url: !!org.url, logo: !!org.logo, sameAs: (org.sameAs?.length ?? 0) > 0 };
      const filled = Object.values(fields).filter(Boolean).length;
      const score = filled === 4 ? 1 : filled >= 2 ? 0.5 : 0;
      return scored(score, { organization: org, fields });
    },
  },

  {
    key: "schema_category_appropriate",
    category: "structured_data",
    type: "DC",
    weight: 6,
    run(ctx) {
      // Detect category from schema types present across all pages
      const allPages = [ctx.homepage, ...ctx.innerPages];
      const allTypes = new Set(allPages.flatMap((p) => p.jsonLd.allTypes));

      function hasAny(...types: string[]) {
        return types.some((t) => allTypes.has(t));
      }

      let detectedCategory: DetectedCategory;
      if (hasAny("Hotel", "Resort", "LodgingBusiness")) {
        // Distinguish luxury vs budget by presence of Offer/AggregateRating on site
        detectedCategory = hasAny("AggregateRating") ? "hospitality-luxury" : "hospitality-budget";
      } else if (hasAny("LegalService", "Attorney", "Notary")) {
        detectedCategory = "legal";
      } else if (hasAny("Product", "Offer", "ItemList", "Store", "ShoppingCenter")) {
        detectedCategory = "ecommerce";
      } else if (hasAny("SoftwareApplication", "WebApplication", "MobileApplication")) {
        detectedCategory = "saas";
      } else if (hasAny("Article", "NewsArticle", "BlogPosting", "NewsMediaOrganization")) {
        detectedCategory = "editorial";
      } else if (hasAny(
        "LocalBusiness", "ProfessionalService", "HomeAndConstructionBusiness",
        "HealthAndBeautyBusiness", "FoodEstablishment", "AutomotiveBusiness",
        "EntertainmentBusiness", "FinancialService", "AccountingService",
        "RealEstateAgent", "TravelAgency", "LodgingBusiness",
      )) {
        detectedCategory = "local-services";
      } else {
        detectedCategory = "other";
      }

      const expected = CATEGORY_SCHEMA_EXPECTATIONS[detectedCategory];
      if (expected.length === 0) {
        // Genuinely unknown category — give partial credit, not a fail
        return scored(0.5, { detected_category: detectedCategory, all_types: [...allTypes], note: "Category could not be determined from schema types present" });
      }

      const pagesWithExpected = allPages.filter((page) =>
        expected.some((type) => page.jsonLd.hasType(type))
      );
      const ratio = pagesWithExpected.length / allPages.length;
      const score = ratio >= 0.8 ? 1 : ratio >= 0.4 ? 0.5 : 0;
      return scored(score, { detected_category: detectedCategory, expected, all_types: [...allTypes], ratio, pages_with_expected: pagesWithExpected.length, total_pages: allPages.length });
    },
  },

  {
    key: "schema_faq_howto",
    category: "structured_data",
    type: "DC",
    weight: 3,
    run(ctx) {
      const hasFaqHeuristic = hasFaqContent(ctx.homepage.static.ok ? (ctx.homepage.static as { html: string }).html : "");
      if (!hasFaqHeuristic) {
        return scored(1, { faq_detected: false, note: "No FAQ content detected — check not applicable, full credit" });
      }
      const hasFaqSchema = ctx.homepage.jsonLd.hasType("FAQPage") ||
        ctx.innerPages.some((p) => p.jsonLd.hasType("FAQPage"));
      const hasHowToSchema = ctx.homepage.jsonLd.hasType("HowTo") ||
        ctx.innerPages.some((p) => p.jsonLd.hasType("HowTo"));
      if (hasFaqSchema || hasHowToSchema) return scored(1, { faq_detected: true, faq_schema: hasFaqSchema, howto_schema: hasHowToSchema });
      return scored(0, { faq_detected: true, faq_schema: false, howto_schema: false }, "FAQ content found but no FAQPage/HowTo schema");
    },
  },

  {
    key: "schema_breadcrumbs",
    category: "structured_data",
    type: "D",
    weight: 2,
    run(ctx) {
      const onInner = ctx.innerPages.some((p) => p.jsonLd.hasType("BreadcrumbList"));
      const onHome = ctx.homepage.jsonLd.hasType("BreadcrumbList");
      const present = onInner || onHome;
      return scored(present ? 1 : 0, { on_homepage: onHome, on_inner_pages: onInner });
    },
  },

  {
    key: "og_tags_complete",
    category: "structured_data",
    type: "D",
    weight: 3,
    run(ctx) {
      const og = ctx.homepage.meta.og;
      const required = ["title", "description", "image", "url", "type"];
      const present = required.filter((k) => !!og[k]);
      const score = present.length === 5 ? 1 : present.length >= 3 ? 0.5 : 0;
      return scored(score, { present, missing: required.filter((k) => !og[k]) });
    },
  },

  {
    key: "twitter_card",
    category: "structured_data",
    type: "D",
    weight: 2,
    run(ctx) {
      const tw = ctx.homepage.meta.twitter;
      const hasCard = !!tw["card"];
      const hasImage = !!tw["image"];
      const score = hasCard && hasImage ? 1 : 0;
      return scored(score, { card: tw["card"] ?? null, has_image: hasImage });
    },
  },

  {
    key: "schema_validates",
    category: "structured_data",
    type: "D",
    weight: 2,
    run(ctx) {
      const errors = ctx.homepage.jsonLd.errors;
      if (errors.length === 0) return scored(1, { errors: [] });
      // Warnings only (we don't distinguish warnings from errors in our extractor yet — treat as 0.5)
      return scored(0.5, { errors }, `${errors.length} JSON-LD parse error(s)`);
    },
  },

  {
    key: "canonical_urls",
    category: "structured_data",
    type: "D",
    weight: 2,
    run(ctx) {
      const homeCanonical = ctx.homepage.meta.canonical;
      const origin = new URL(ctx.input.canonical).origin;
      const homepageOk = homeCanonical !== null && homeCanonical.startsWith(origin);

      if (ctx.innerPages.length === 0) {
        return scored(homepageOk ? 1 : 0, { homepage_canonical: homeCanonical });
      }

      const innerOk = ctx.innerPages.filter((p) => {
        const c = p.meta.canonical;
        return c !== null && c.startsWith(origin);
      });
      const allPages = [{ meta: { canonical: homeCanonical } }, ...ctx.innerPages];
      // Fix: operator precedence — homepageOk contributes 1, not folded into ternary
      const pagesWithCanonical = (homepageOk ? 1 : 0) + innerOk.length;
      const ratio = pagesWithCanonical / allPages.length;
      // Proportional: full marks >=80% coverage, partial for >=50%, 0 below that
      const score = ratio >= 0.8 ? 1 : ratio >= 0.5 ? 0.5 : 0;
      return scored(score, { homepage_canonical: homeCanonical, inner_pages_with_canonical: innerOk.length, total: allPages.length, ratio: Math.round(ratio * 100) });
    },
  },
];

function hasFaqContent(html: string): boolean {
  if (!html) return false;
  if (/(<details[\s>]|<summary[\s>])/i.test(html)) return true;
  const headingRe = /<h[2-4][^>]*>([^<]*)<\/h[2-4]>/gi;
  let m: RegExpExecArray | null;
  let questionHeadings = 0;
  while ((m = headingRe.exec(html)) !== null) {
    if (/^(FAQ|Frequently Asked|Questions)/i.test(m[1].trim())) return true;
    if (m[1].trim().endsWith("?")) questionHeadings++;
  }
  return questionHeadings >= 2;
}
