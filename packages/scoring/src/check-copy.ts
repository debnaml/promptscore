/** Human-readable copy for each check key. Title and one-line explanations used in reports. */
export interface CheckCopy {
  title: string;
  positiveExplanation: string;  // "why this helps AI find you"
  negativeExplanation: string;  // "what this gap costs you"
  howToFix: string;             // 2-3 sentence fix guide
}

export const CHECK_COPY: Record<string, CheckCopy> = {
  // --- Crawler access ---
  robots_valid: {
    title: "robots.txt is present and valid",
    positiveExplanation: "A well-formed robots.txt gives AI crawlers clear permission signals from the first request.",
    negativeExplanation: "A missing or malformed robots.txt leaves AI crawlers guessing — many will skip your site by default.",
    howToFix: "Create a robots.txt at yourdomain.com/robots.txt. Start with 'User-agent: *\\nAllow: /' to permit all crawlers, then add specific rules below. Validate with Google Search Console.",
  },
  retrieval_bots_allowed: {
    title: "AI retrieval bots can access your site",
    positiveExplanation: "OAI-SearchBot, PerplexityBot, and Claude-SearchBot can crawl and index your content for AI search results.",
    negativeExplanation: "Blocking retrieval bots means ChatGPT, Perplexity, and Claude won't include your site in AI-powered answers.",
    howToFix: "Add explicit Allow rules for OAI-SearchBot, ChatGPT-User, PerplexityBot, Perplexity-User, and Claude-SearchBot in your robots.txt. Check your WAF/Cloudflare rules aren't blocking these user agents.",
  },
  training_bots_explicit: {
    title: "Explicit stance on AI training bots",
    positiveExplanation: "You've made a clear decision about GPTBot, ClaudeBot, and Google-Extended — AI providers respect explicit rules.",
    negativeExplanation: "Silence on training bots is treated differently by each vendor — some crawl everything, others skip unspecified sites.",
    howToFix: "Add explicit Disallow or Allow rules for GPTBot, ClaudeBot, Google-Extended, and CCBot. Decide your training data policy first — both 'allow' and 'disallow' are valid choices; what matters is being explicit.",
  },
  sitemap_present_linked: {
    title: "Sitemap linked from robots.txt",
    positiveExplanation: "AI crawlers find your full content inventory via the Sitemap directive in robots.txt.",
    negativeExplanation: "Without a sitemap or robots.txt link, AI crawlers may miss large portions of your site.",
    howToFix: "Generate a sitemap.xml and reference it in robots.txt with 'Sitemap: https://yourdomain.com/sitemap.xml'. Submit it to Google Search Console too.",
  },
  https_hsts: {
    title: "HTTPS with HSTS enabled",
    positiveExplanation: "HSTS tells browsers and crawlers to always use encrypted connections — a trust signal that AI systems factor in.",
    negativeExplanation: "Without HSTS, connections could be downgraded to HTTP, reducing trust scores with AI retrieval systems.",
    howToFix: "Add the Strict-Transport-Security header: 'max-age=31536000; includeSubDomains'. Most CDNs (Cloudflare, Vercel) can enable this in one click.",
  },
  js_dependency_ratio: {
    title: "Content renders without JavaScript",
    positiveExplanation: "Most of your content is visible in the raw HTML — AI crawlers that don't execute JS can read everything.",
    negativeExplanation: "Content hidden behind JavaScript is invisible to most AI crawlers, shrinking your indexed footprint.",
    howToFix: "Switch to server-side rendering (Next.js, Nuxt, Astro) or add static HTML fallbacks. Use Google's Rich Results Test to see what Googlebot sees.",
  },
  pagespeed_mobile: {
    title: "Fast mobile performance",
    positiveExplanation: "A PageSpeed score ≥75 signals well-structured, lightweight pages that crawlers can process quickly.",
    negativeExplanation: "Slow pages are crawled less frequently — AI search indexes may work from stale copies of your content.",
    howToFix: "Run PageSpeed Insights on your homepage. Focus on Largest Contentful Paint: compress images, defer non-critical JS, and use a CDN.",
  },

  // --- Structured data ---
  schema_organization: {
    title: "Organization schema markup",
    positiveExplanation: "JSON-LD Organization schema tells AI exactly who you are, what you do, and how to find you.",
    negativeExplanation: "Without Organization schema, AI systems have to infer your identity from raw text — increasing errors and omissions.",
    howToFix: "Add a JSON-LD script block with @type: Organization, including name, url, logo, and sameAs pointing to your social profiles. Place it in the <head> on every page.",
  },
  schema_category_appropriate: {
    title: "Schema types match your business category",
    positiveExplanation: "Your schema types (Hotel, LegalService, Product, etc.) match what AI systems expect for your category.",
    negativeExplanation: "Mismatched schema types confuse AI categorisation and reduce the chance of appearing in category-specific answers.",
    howToFix: "Identify the primary schema type for your category (schema.org/Hotel, schema.org/LegalService, etc.) and apply it to every relevant page. Use Google's Structured Data Testing Tool to validate.",
  },
  schema_faq_howto: {
    title: "FAQ/HowTo schema on Q&A content",
    positiveExplanation: "FAQ schema on your Q&A content makes it directly quotable in AI-generated answers and featured snippets.",
    negativeExplanation: "Without FAQ schema, your Q&A content is less likely to be surfaced as a direct answer in AI search.",
    howToFix: "Wrap your existing FAQ sections with @type: FAQPage and Question/Answer schema. Most CMS plugins support this, or add JSON-LD directly.",
  },
  schema_breadcrumbs: {
    title: "BreadcrumbList schema on inner pages",
    positiveExplanation: "Breadcrumb schema helps AI understand your site's information hierarchy and which pages are most important.",
    negativeExplanation: "Without breadcrumbs, AI systems may struggle to understand the relationships between pages on your site.",
    howToFix: "Add @type: BreadcrumbList schema to every inner page, reflecting the actual navigation path. Next.js and most CMS platforms have plugins for this.",
  },
  og_tags_complete: {
    title: "Complete Open Graph tags",
    positiveExplanation: "Full OG tags (title, description, image, url, type) ensure consistent previews across AI-powered social and search surfaces.",
    negativeExplanation: "Incomplete OG tags mean AI systems generate their own summaries, often inaccurate or lacking your branding.",
    howToFix: "Add og:title, og:description, og:image (1200×630px), og:url, and og:type to every page's <head>. Use distinct descriptions — don't copy the meta description.",
  },
  twitter_card: {
    title: "Twitter/X card with image",
    positiveExplanation: "Twitter card metadata ensures your content displays with an image when shared or cited in AI-generated content.",
    negativeExplanation: "Without Twitter cards, links to your site appear as plain text in many AI-powered sharing surfaces.",
    howToFix: "Add twitter:card='summary_large_image', twitter:title, twitter:description, and twitter:image to all page <head> sections.",
  },
  schema_validates: {
    title: "Schema markup has no errors",
    positiveExplanation: "Your structured data passes validation — no parsing errors that could cause AI systems to silently discard it.",
    negativeExplanation: "Schema errors are silently ignored by crawlers, meaning your structured data investment is partially wasted.",
    howToFix: "Run your pages through schema.org/validator or Google's Rich Results Test. Fix any red errors first; warnings are lower priority.",
  },
  canonical_urls: {
    title: "Canonical URLs set correctly",
    positiveExplanation: "Self-referential canonical tags prevent duplicate content confusion for AI crawlers.",
    negativeExplanation: "Missing or wrong canonicals split AI crawler attention across duplicate pages, diluting your content's authority.",
    howToFix: "Add <link rel='canonical' href='https://yourdomain.com/page/'> to every page, pointing to the preferred URL. Ensure it matches the og:url tag.",
  },

  // --- Content clarity ---
  heading_hierarchy: {
    title: "Logical heading structure (H1–H6)",
    positiveExplanation: "Clean heading hierarchy lets AI parse your content structure and identify the most important topics on each page.",
    negativeExplanation: "Broken heading structure (multiple H1s, skipped levels) makes it harder for AI to extract your key topics accurately.",
    howToFix: "Ensure each page has exactly one H1. Use H2s for main sections, H3s for subsections. Never skip a level (e.g. H1 → H3 without H2).",
  },
  semantic_landmarks: {
    title: "Semantic HTML landmarks",
    positiveExplanation: "Proper use of <main>, <nav>, <header>, <footer>, and <article> lets AI skip boilerplate and focus on your core content.",
    negativeExplanation: "Div-soup layouts make it harder for AI to identify where your main content starts and ends.",
    howToFix: "Replace div wrappers with semantic elements: <header> for top navigation, <main> for primary content, <article> for posts, <footer> for footer content.",
  },
  alt_text_coverage: {
    title: "Images have descriptive alt text",
    positiveExplanation: "Descriptive alt text on images extends your content into AI's understanding of your visual assets.",
    negativeExplanation: "Images without alt text are invisible to AI crawlers — a missed opportunity to reinforce your content topics.",
    howToFix: "Add descriptive alt text to all content images (not decorative ones, which should have alt=''). Describe what the image shows, not 'image of...'.",
  },
  publication_dates: {
    title: "Publication and update dates marked up",
    positiveExplanation: "Dated content with datePublished and dateModified schema helps AI systems surface your freshest, most relevant pages.",
    negativeExplanation: "Without publication dates, AI systems can't tell if your content is current — it may be deprioritised in favour of dated competitors.",
    howToFix: "Add datePublished and dateModified to Article/BlogPosting schema. Use <time datetime='YYYY-MM-DD'> in your HTML for visible dates.",
  },
  homepage_clarity_rubric: {
    title: "Homepage clearly explains what you do",
    positiveExplanation: "Your homepage immediately communicates what you do, who it's for, and the outcome — perfect for AI citation.",
    negativeExplanation: "Vague homepage copy means AI can't accurately represent your business in answers — or worse, misrepresents it.",
    howToFix: "Rewrite your hero section to answer in one sentence: what you do, who for, and the measurable result. Avoid generic phrases like 'innovative solutions'.",
  },
  query_coverage_rubric: {
    title: "Content answers real user queries",
    positiveExplanation: "Your content directly addresses the questions users ask AI assistants about your category — increasing citation frequency.",
    negativeExplanation: "Content that doesn't match common user queries won't be surfaced in AI-generated answers, even if it's high quality.",
    howToFix: "Research 10 questions users ask about your category. Create dedicated pages or clear sections addressing each. Use the exact question as a heading.",
  },
  faq_content_present: {
    title: "FAQ content detected",
    positiveExplanation: "FAQ sections are frequently cited verbatim in AI answers — a direct pipeline from your site to AI responses.",
    negativeExplanation: "Without FAQ content, you're missing one of the highest-yield formats for AI citation.",
    howToFix: "Add a FAQ section to your homepage and key landing pages. Include 5–10 questions your customers actually ask. Mark them up with FAQPage schema.",
  },
  content_depth_linking: {
    title: "Content depth and internal linking",
    positiveExplanation: "Pages with substantial content (500+ words) and strong internal links signal topic authority to AI ranking systems.",
    negativeExplanation: "Thin pages with few links suggest shallow expertise — AI systems favour comprehensive, well-connected content.",
    howToFix: "Expand thin pages to at least 500 words covering the topic thoroughly. Add 5+ contextual internal links pointing to related content on your site.",
  },

  // --- AI-specific signals ---
  llms_txt_present: {
    title: "llms.txt file present and valid",
    positiveExplanation: "A valid llms.txt signals proactive AI-readiness and gives LLM providers a curated summary of your content.",
    negativeExplanation: "Missing llms.txt means AI providers must infer your content structure — a less reliable approach.",
    howToFix: "Create /llms.txt at your domain root. Start with a # H1 heading, then ## sections listing your key pages as markdown links. See llmstxt.org for the spec.",
  },
  llms_full_txt: {
    title: "llms-full.txt extended version present",
    positiveExplanation: "llms-full.txt provides AI systems with richer context for deep queries about your business.",
    negativeExplanation: "Without the full version, AI systems work from a limited snapshot of your content.",
    howToFix: "Create /llms-full.txt with detailed descriptions of each page, your products/services, team bios, and any content you want AI to understand well.",
  },
  retrieval_vs_training_differentiated: {
    title: "Retrieval and training bots treated differently",
    positiveExplanation: "Your robots.txt distinguishes between bots that answer queries (allow) and bots that train models (your choice) — the correct modern posture.",
    negativeExplanation: "Treating all AI bots identically either blocks valuable retrieval exposure or grants training rights you may not intend.",
    howToFix: "In robots.txt: Allow OAI-SearchBot, ChatGPT-User, PerplexityBot, Claude-SearchBot (retrieval). Set an explicit stance for GPTBot, ClaudeBot, CCBot (training).",
  },
  waf_not_blocking_ai_bots: {
    title: "Firewall not blocking AI retrieval bots",
    positiveExplanation: "AI retrieval bots can reach your site from their data centers — no WAF or rate-limit interference.",
    negativeExplanation: "Cloudflare or CDN bot-blocking rules may be silently preventing AI crawlers from indexing your content.",
    howToFix: "Check Cloudflare → Security → Bots. Ensure OAI-SearchBot, PerplexityBot, and Claude-SearchBot user agents are whitelisted. Test by fetching your homepage with their UAs.",
  },
  ai_policy_page: {
    title: "AI policy page present",
    positiveExplanation: "A dedicated AI policy page shows AI providers you've thought carefully about your content's use in AI systems.",
    negativeExplanation: "Without an AI policy, providers have less guidance on how to represent your business and content.",
    howToFix: "Create /ai-policy.html stating your stance on AI indexing, training, and citation. Link it from your footer. Keep it under 500 words.",
  },
  tdm_headers: {
    title: "TDM / AI training reservation headers set",
    positiveExplanation: "X-Robots-Tag with TDM reservation clearly signals your training data preferences to AI providers.",
    negativeExplanation: "Without TDM headers, your training data stance is ambiguous — some providers default to 'permitted'.",
    howToFix: "Add X-Robots-Tag: noai, noimageai to pages where you don't want training. Or use tdm-reservation=1 with a link to your tdm policy page.",
  },

  // --- Authority & trust ---
  about_page_substantive: {
    title: "Substantive About page (300+ words)",
    positiveExplanation: "A detailed About page gives AI systems accurate background to represent your team, history, and mission.",
    negativeExplanation: "A thin or missing About page is a strong E-E-A-T signal problem — AI systems may question your authority.",
    howToFix: "Rewrite your About page to include: company history, founding story, team bios with names and roles, credentials/awards, and your mission. Aim for 500+ words.",
  },
  contact_info_complete: {
    title: "Complete contact information in HTML and schema",
    positiveExplanation: "Full contact details (address, phone, email) in HTML and schema confirm your business is real and locatable.",
    negativeExplanation: "Missing contact information is a strong spam/quality signal — AI systems deprioritise sites without verifiable contact details.",
    howToFix: "Add address, phone, and email to your footer HTML and in ContactPoint schema inside your Organization JSON-LD. Include these on your Contact page too.",
  },
  author_bylines: {
    title: "Author bylines with bios on content",
    positiveExplanation: "Named authors with bios are a key E-E-A-T signal — AI systems use authorship to assess content credibility.",
    negativeExplanation: "Anonymous content is harder for AI to trust — it may be deprioritised in favour of attributed alternatives.",
    howToFix: "Add author names to all articles and blog posts. Link to author bio pages. Add Person schema with name, description, and URL to each author page.",
  },
  wikidata_presence: {
    title: "Entity on Wikidata",
    positiveExplanation: "A Wikidata entry anchors your brand as a known entity — AI systems use this to disambiguate and validate your business.",
    negativeExplanation: "Without a Wikidata presence, AI systems can't cross-reference your brand against a trusted knowledge graph.",
    howToFix: "Create a Wikidata item for your organisation at wikidata.org. Include description, website, founding date, industry, and key people. This process takes 1–2 hours.",
  },
  sameas_links: {
    title: "3+ authoritative sameAs links",
    positiveExplanation: "Multiple sameAs links (LinkedIn, Crunchbase, Companies House) help AI systems confirm your identity across the web.",
    negativeExplanation: "Without sameAs links, AI systems struggle to connect your website to your presence on other platforms.",
    howToFix: "Add sameAs URLs to your Organization schema pointing to LinkedIn, Twitter/X, Facebook, Crunchbase, Companies House, and any other authoritative profiles.",
  },
  citation_practice: {
    title: "Content cites sources and links to authorities",
    positiveExplanation: "Citing sources and linking to authoritative references signals trustworthy, well-researched content to AI systems.",
    negativeExplanation: "Unsourced claims are a red flag for AI trustworthiness scoring — your content may be deprioritised as opinion.",
    howToFix: "Add citations to statistics (link to the original study), quote experts by name with attribution, and link outward to government, academic, or established publication sources.",
  },
  brand_consistency: {
    title: "Consistent brand name across schema, titles, and copy",
    positiveExplanation: "Your brand name is consistent across structured data, page titles, and visible copy — reducing AI disambiguation errors.",
    negativeExplanation: "Inconsistent naming (Ltd vs Limited, abbreviations vs full name) causes AI systems to treat your brand as multiple different entities.",
    howToFix: "Standardise your exact legal or trading name across: Organization schema, title tags, Open Graph tags, footer, and About page. Pick one form and use it everywhere.",
  },
};
