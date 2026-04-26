import { z } from "zod/v4";
import { callClaude } from "../client";
import type { ClaudeResult } from "../client";

export const HOMEPAGE_CLARITY_VERSION = "v1";

const criterionSchema = z.object({
  score: z.union([z.literal(0), z.literal(1), z.literal(2)]),
  evidence: z.string().max(300),
});

export const homepageClaritySchema = z.object({
  what_business_does: criterionSchema,
  who_for: criterionSchema,
  outcome: criterionSchema,
  overall_notes: z.string().max(200),
});

export type HomepageClarityResult = z.output<typeof homepageClaritySchema>;

const SYSTEM_PROMPT = `You are an expert web content evaluator assessing how well a homepage communicates to AI search systems.

Score the homepage on three criteria, each 0–2:
- **what_business_does**: Is it immediately clear what the company/site actually does?
  2 = stated explicitly in first viewport, unambiguous
  1 = implied or stated weakly, requires inference
  0 = not stated or contradictory

- **who_for**: Is the target audience clearly identified?
  2 = explicit (job title, industry, use case, or named persona)
  1 = implied from context
  0 = absent

- **outcome**: Is the value or outcome for the user clearly communicated?
  2 = explicit benefit or result stated (saves time, increases revenue, reduces risk, etc.)
  1 = implied benefit
  0 = only features, no benefit

For each criterion, quote or closely paraphrase the strongest piece of evidence from the content.

---
EXAMPLES

Example 1 — scores 2/2/2 (total 6):
Homepage content: "The world's #1 CRM. Salesforce helps 150,000 companies sell faster, service better, and market smarter — all from one platform. Used by enterprise sales teams and SMBs alike."
{
  "what_business_does": { "score": 2, "evidence": "world's #1 CRM … sell faster, service better, market smarter" },
  "who_for":            { "score": 2, "evidence": "enterprise sales teams and SMBs alike" },
  "outcome":            { "score": 2, "evidence": "sell faster, service better, market smarter — all from one platform" },
  "overall_notes":      "Textbook homepage — all three criteria met in the headline alone."
}

Example 2 — scores 1/0/1 (total 2):
Homepage content: "Welcome to Acme Corp. Innovative solutions for a changing world. We're here to help."
{
  "what_business_does": { "score": 1, "evidence": "innovative solutions for a changing world — implies a solution company but unclear what type" },
  "who_for":            { "score": 0, "evidence": "" },
  "outcome":            { "score": 1, "evidence": "we're here to help — vague implied benefit" },
  "overall_notes":      "Generic copy with no specific audience or outcome. Classic corporate filler."
}`;

function buildUserPrompt(
  title: string,
  description: string,
  h1: string,
  mainContent: string
): string {
  return `Score this homepage content:

Title: ${title}
Meta description: ${description}
H1: ${h1}
First 500 words of main content:
${mainContent}`;
}

const TOOL_INPUT_SCHEMA = {
  type: "object",
  required: ["what_business_does", "who_for", "outcome", "overall_notes"],
  properties: {
    what_business_does: {
      type: "object",
      required: ["score", "evidence"],
      properties: {
        score: { type: "integer", enum: [0, 1, 2] },
        evidence: { type: "string", maxLength: 300 },
      },
    },
    who_for: {
      type: "object",
      required: ["score", "evidence"],
      properties: {
        score: { type: "integer", enum: [0, 1, 2] },
        evidence: { type: "string", maxLength: 300 },
      },
    },
    outcome: {
      type: "object",
      required: ["score", "evidence"],
      properties: {
        score: { type: "integer", enum: [0, 1, 2] },
        evidence: { type: "string", maxLength: 300 },
      },
    },
    overall_notes: { type: "string", maxLength: 200 },
  },
};

export async function scoreHomepageClarity(input: {
  title: string;
  description: string;
  h1: string;
  mainContent: string;
}): Promise<ClaudeResult<HomepageClarityResult>> {
  return callClaude({
    model: "claude-sonnet-4-5",
    systemPrompt: SYSTEM_PROMPT,
    userPrompt: buildUserPrompt(input.title, input.description, input.h1, input.mainContent),
    schema: homepageClaritySchema,
    toolInputSchema: TOOL_INPUT_SCHEMA,
    promptVersion: HOMEPAGE_CLARITY_VERSION,
    checkKey: "homepage_clarity_rubric",
  });
}

/** Normalise the rubric result to a 0–1 check score */
export function normaliseHomepageClarity(result: HomepageClarityResult): number {
  const total = result.what_business_does.score + result.who_for.score + result.outcome.score;
  return total / 6;
}
