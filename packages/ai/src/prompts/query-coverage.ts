import { z } from "zod/v4";
import { callClaude } from "../client";
import type { ClaudeResult } from "../client";

export const QUERY_COVERAGE_VERSION = "v1";

const queryScoreSchema = z.object({
  query: z.string(),
  score: z.union([z.literal(0), z.literal(0.5), z.literal(1)]),
  evidence: z.string().max(300),
});

export const queryCoverageSchema = z.object({
  queries: z.array(queryScoreSchema).length(5),
});

export type QueryCoverageResult = z.output<typeof queryCoverageSchema>;

const SYSTEM_PROMPT = `You are an AI search quality evaluator. Your task is to assess whether a website's content answers the questions a user in the target market is likely to ask an AI assistant.

In a single response, you must:
1. Generate exactly 5 queries a real user in this market would ask an AI assistant.
2. For each query, score whether the provided site content directly answers it:
   - 1 = content directly and clearly answers the query
   - 0.5 = partial / requires inference or reading between the lines  
   - 0 = no relevant content found

Be specific. Quote or paraphrase actual content from the site as evidence.
Do NOT generate generic queries — make them specific to the detected category and location if present.`;

function buildUserPrompt(
  category: string,
  location: string | null,
  content: string
): string {
  const locationPart = location ? ` in ${location}` : "";
  return `Business category: ${category}${locationPart}

Site content (homepage + sampled pages, up to 4000 words):
${content}

Generate 5 specific queries a user would ask an AI assistant about a ${category} business${locationPart}, then score how well the site content answers each.`;
}

const TOOL_INPUT_SCHEMA = {
  type: "object",
  required: ["queries"],
  properties: {
    queries: {
      type: "array",
      minItems: 5,
      maxItems: 5,
      items: {
        type: "object",
        required: ["query", "score", "evidence"],
        properties: {
          query: { type: "string" },
          score: { type: "number", enum: [0, 0.5, 1] },
          evidence: { type: "string", maxLength: 300 },
        },
      },
    },
  },
};

export async function scoreQueryCoverage(input: {
  category: string;
  location: string | null;
  content: string;
}): Promise<ClaudeResult<QueryCoverageResult>> {
  return callClaude({
    model: "claude-sonnet-4-5",
    systemPrompt: SYSTEM_PROMPT,
    userPrompt: buildUserPrompt(input.category, input.location, input.content),
    schema: queryCoverageSchema,
    toolInputSchema: TOOL_INPUT_SCHEMA,
    promptVersion: QUERY_COVERAGE_VERSION,
    checkKey: "query_coverage_rubric",
  });
}

/** Normalise the rubric result to a 0–1 check score */
export function normaliseQueryCoverage(result: QueryCoverageResult): number {
  if (result.queries.length === 0) return 0;
  const sum = result.queries.reduce((s, q) => s + q.score, 0);
  return sum / result.queries.length;
}
