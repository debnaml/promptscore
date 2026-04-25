// @promptscore/ai — Claude prompts (versioned), JSON schemas
export { callClaude } from "./client";
export type { ClaudeCallOptions, ClaudeSuccess, ClaudeSkipped, ClaudeResult } from "./client";

export { detectCategory, categoryDetectionSchema, CATEGORY_DETECTION_VERSION, DETECTED_CATEGORIES } from "./prompts/category-detection";
export type { CategoryDetectionResult, DetectedCategory } from "./prompts/category-detection";

export { scoreHomepageClarity, normaliseHomepageClarity, homepageClaritySchema, HOMEPAGE_CLARITY_VERSION } from "./prompts/homepage-clarity";
export type { HomepageClarityResult } from "./prompts/homepage-clarity";

export { scoreQueryCoverage, normaliseQueryCoverage, queryCoverageSchema, QUERY_COVERAGE_VERSION } from "./prompts/query-coverage";
export type { QueryCoverageResult } from "./prompts/query-coverage";

export { scoreCitationPractice, citationPracticeSchema, CITATION_PRACTICE_VERSION } from "./prompts/citation-practice";
export type { CitationPracticeResult } from "./prompts/citation-practice";
