export type Effort = "small" | "medium" | "large";

export const EFFORT_MAP: Record<string, Effort> = {
  // Crawler access
  robots_valid: "small",
  retrieval_bots_allowed: "small",
  training_bots_explicit: "small",
  sitemap_present_linked: "small",
  https_hsts: "small",
  js_dependency_ratio: "large",
  pagespeed_mobile: "medium",

  // Structured data
  schema_organization: "small",
  schema_category_appropriate: "medium",
  schema_faq_howto: "medium",
  schema_breadcrumbs: "medium",
  og_tags_complete: "small",
  twitter_card: "small",
  schema_validates: "small",
  canonical_urls: "small",

  // Content clarity
  heading_hierarchy: "small",
  semantic_landmarks: "medium",
  alt_text_coverage: "medium",
  publication_dates: "medium",
  homepage_clarity_rubric: "large",
  query_coverage_rubric: "large",
  faq_content_present: "medium",
  content_depth_linking: "large",

  // AI-specific
  llms_txt_present: "small",
  llms_full_txt: "small",
  retrieval_vs_training_differentiated: "small",
  waf_not_blocking_ai_bots: "medium",
  ai_policy_page: "small",
  tdm_headers: "small",

  // Authority & trust
  about_page_substantive: "medium",
  contact_info_complete: "small",
  author_bylines: "large",
  wikidata_presence: "large",
  sameas_links: "medium",
  citation_practice: "large",
  brand_consistency: "small",
};
