import { z } from "zod/v4";
import { callClaude } from "../client";
import type { ClaudeResult } from "../client";

export const CITATION_PRACTICE_VERSION = "v1";

const pageSchema = z.object({
  url: z.string(),
  cites_sources: z.union([z.literal(0), z.literal(0.5), z.literal(1)]),
  outbound_authority_links: z.union([z.literal(0), z.literal(0.5), z.literal(1)]),
  notes: z.string().max(200),
});

export const citationPracticeSchema = z.object({
  pages: z.array(pageSchema),
  overall: z.union([z.literal(0), z.literal(0.5), z.literal(1)]),
});

export type CitationPracticeResult = z.output<typeof citationPracticeSchema>;

const SYSTEM_PROMPT = `You are evaluating a website's citation and source-linking practices for AI trustworthiness.

For each page, score:

**cites_sources** (0 / 0.5 / 1):
- 1 = clear citations to primary sources (named studies, reports, statistics with their origin)
- 0.5 = some references but vague or unnamed ("studies show", "experts say")
- 0 = no source citations

**outbound_authority_links** (0 / 0.5 / 1):
- 1 = links to authoritative external domains (government, academia, established publications)
- 0.5 = some outbound linking, mostly commercial or low-authority
- 0 = no outbound links

**overall**: weighted impression across all pages:
- 1 = strong citation practice throughout
- 0.5 = mixed or inconsistent
- 0 = no meaningful citation practice`;

function buildUserPrompt(pages: Array<{ url: string; content: string }>): string {
  const sections = pages
    .map(
      (p, i) => `--- Page ${i + 1}: ${p.url} ---\n${p.content.slice(0, 2000)}`
    )
    .join("\n\n");
  return `Evaluate citation practice for these ${pages.length} page(s):\n\n${sections}`;
}

const TOOL_INPUT_SCHEMA = {
  type: "object",
  required: ["pages", "overall"],
  properties: {
    pages: {
      type: "array",
      items: {
        type: "object",
        required: ["url", "cites_sources", "outbound_authority_links", "notes"],
        properties: {
          url: { type: "string" },
          cites_sources: { type: "number", enum: [0, 0.5, 1] },
          outbound_authority_links: { type: "number", enum: [0, 0.5, 1] },
          notes: { type: "string", maxLength: 200 },
        },
      },
    },
    overall: { type: "number", enum: [0, 0.5, 1] },
  },
};

export async function scoreCitationPractice(input: {
  pages: Array<{ url: string; content: string }>;
}): Promise<ClaudeResult<CitationPracticeResult>> {
  return callClaude({
    model: "claude-haiku-4-5-20251001",
    systemPrompt: SYSTEM_PROMPT,
    userPrompt: buildUserPrompt(input.pages),
    schema: citationPracticeSchema,
    toolInputSchema: TOOL_INPUT_SCHEMA,
    promptVersion: CITATION_PRACTICE_VERSION,
    checkKey: "citation_practice",
  });
}
