import { crawlerAccessChecks } from "./categories/crawler-access";
import { structuredDataChecks } from "./categories/structured-data";
import { contentClarityChecks } from "./categories/content-clarity";
import { aiSpecificChecks } from "./categories/ai-specific";
import { authorityTrustChecks } from "./categories/authority-trust";
import type { Check } from "./types";

export const ALL_CHECKS: Check[] = [
  ...crawlerAccessChecks,
  ...structuredDataChecks,
  ...contentClarityChecks,
  ...aiSpecificChecks,
  ...authorityTrustChecks,
];
