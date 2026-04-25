import { z } from "zod/v4";
import { callClaude } from "../client";
import type { ClaudeResult } from "../client";

export const CATEGORY_DETECTION_VERSION = "v1";

export const DETECTED_CATEGORIES = [
  "hospitality-luxury",
  "hospitality-budget",
  "legal",
  "ecommerce",
  "saas",
  "editorial",
  "local-services",
  "other",
] as const;

export type DetectedCategory = (typeof DETECTED_CATEGORIES)[number];

export const categoryDetectionSchema = z.object({
  category: z.enum(DETECTED_CATEGORIES),
  confidence: z.enum(["high", "medium", "low"]),
  reasoning: z.string().max(200),
});

export type CategoryDetectionResult = z.output<typeof categoryDetectionSchema>;

const SYSTEM_PROMPT = `You are a website category classifier. Given a snippet of homepage content, classify the website into exactly one category from the provided list. Be concise and decisive. Respond only with the structured tool output — no prose.`;

function buildUserPrompt(title: string, description: string, h1: string, mainContent: string): string {
  return `Classify this website into one of these categories: hospitality-luxury, hospitality-budget, legal, ecommerce, saas, editorial, local-services, other.

---
Title: ${title}
Meta description: ${description}
H1: ${h1}
Main content (first 500 words):
${mainContent}
---

Choose the single best-fit category. Use "other" only if none of the named categories clearly apply.`;
}

export async function detectCategory(input: {
  title: string;
  description: string;
  h1: string;
  mainContent: string;
}): Promise<ClaudeResult<CategoryDetectionResult>> {
  return callClaude({
    model: "claude-haiku-4-5-20251001",
    systemPrompt: SYSTEM_PROMPT,
    userPrompt: buildUserPrompt(input.title, input.description, input.h1, input.mainContent),
    schema: categoryDetectionSchema,
    promptVersion: CATEGORY_DETECTION_VERSION,
    checkKey: "category_detection",
  });
}
