import Anthropic from "@anthropic-ai/sdk";
import type { z } from "zod/v4";
import { createHash } from "crypto";

export interface ClaudeCallOptions<T extends z.ZodTypeAny> {
  model: string;
  systemPrompt: string;
  userPrompt: string;
  /** Zod schema for the expected JSON output */
  schema: T;
  /** Identifies the prompt version — part of the cache key */
  promptVersion: string;
  /** Check key for logging */
  checkKey: string;
}

export interface ClaudeSuccess<T> {
  ok: true;
  data: T;
  tokensUsed: number;
  latencyMs: number;
  promptVersion: string;
  inputHash: string;
}

export interface ClaudeSkipped {
  ok: false;
  skipped: true;
  reason: string;
  promptVersion: string;
  inputHash: string;
}

export type ClaudeResult<T> = ClaudeSuccess<T> | ClaudeSkipped;

function hashInput(systemPrompt: string, userPrompt: string, promptVersion: string): string {
  return createHash("sha256")
    .update(`${promptVersion}\n${systemPrompt}\n${userPrompt}`)
    .digest("hex")
    .slice(0, 16);
}

function buildClient(): Anthropic {
  const key = process.env["ANTHROPIC_API_KEY"];
  if (!key) throw new Error("ANTHROPIC_API_KEY is not set");
  return new Anthropic({ apiKey: key });
}

/**
 * Call Claude with forced tool-use to get structured JSON output validated by a Zod schema.
 * Retries once on parse/validation failure, then returns a ClaudeSkipped result.
 */
export async function callClaude<T extends z.ZodTypeAny>(
  options: ClaudeCallOptions<T>,
  client?: Anthropic
): Promise<ClaudeResult<z.output<T>>> {
  const { model, systemPrompt, userPrompt, schema, promptVersion, checkKey } = options;
  const inputHash = hashInput(systemPrompt, userPrompt, promptVersion);

  let anthropic: Anthropic;
  try {
    anthropic = client ?? buildClient();
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, skipped: true, reason: msg, promptVersion, inputHash };
  }

  // Build a tool definition whose input schema mirrors the Zod schema
  const toolName = "submit_result";
  const toolDescription = "Submit the structured analysis result as JSON matching the schema exactly.";

  async function attempt(): Promise<{ json: unknown; tokensUsed: number; latencyMs: number }> {
    const start = Date.now();
    const response = await anthropic.messages.create({
      model,
      max_tokens: 1024,
      temperature: 0,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
      tools: [
        {
          name: toolName,
          description: toolDescription,
          input_schema: {
            type: "object" as const,
            description: "The structured result",
            properties: {},
            additionalProperties: true,
          },
        },
      ],
      tool_choice: { type: "tool", name: toolName },
    });

    const latencyMs = Date.now() - start;
    const tokensUsed = response.usage.input_tokens + response.usage.output_tokens;

    const toolUse = response.content.find((b) => b.type === "tool_use");
    if (!toolUse || toolUse.type !== "tool_use") {
      throw new Error("Claude did not return a tool_use block");
    }

    return { json: toolUse.input, tokensUsed, latencyMs };
  }

  const skipped = (reason: string): ClaudeSkipped => ({
    ok: false,
    skipped: true,
    reason,
    promptVersion,
    inputHash,
  });

  let firstResult: { json: unknown; tokensUsed: number; latencyMs: number } | undefined;

  // First attempt
  try {
    firstResult = await attempt();
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.warn(`[ai:${checkKey}] First attempt failed: ${msg}`);
    // Retry once
    try {
      firstResult = await attempt();
    } catch (e2) {
      const msg2 = e2 instanceof Error ? e2.message : String(e2);
      console.error(`[ai:${checkKey}] Retry failed: ${msg2}`);
      return skipped(`API error after retry: ${msg2}`);
    }
  }

  // Validate against Zod schema
  const parsed = schema.safeParse(firstResult.json);
  if (parsed.success) {
    console.log(`[ai:${checkKey}] ok — ${firstResult.tokensUsed} tokens, ${firstResult.latencyMs}ms, hash=${inputHash}`);
    return {
      ok: true,
      data: parsed.data as z.output<T>,
      tokensUsed: firstResult.tokensUsed,
      latencyMs: firstResult.latencyMs,
      promptVersion,
      inputHash,
    };
  }

  // Schema validation failed — retry once
  console.warn(`[ai:${checkKey}] Schema validation failed, retrying`);
  try {
    const retried = await attempt();
    const reparsed = schema.safeParse(retried.json);
    if (reparsed.success) {
      console.log(`[ai:${checkKey}] ok (retry) — ${retried.tokensUsed} tokens`);
      return {
        ok: true,
        data: reparsed.data as z.output<T>,
        tokensUsed: retried.tokensUsed,
        latencyMs: retried.latencyMs,
        promptVersion,
        inputHash,
      };
    }
    return skipped(`Schema validation failed after retry: ${JSON.stringify(reparsed.error.issues)}`);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return skipped(`Retry error: ${msg}`);
  }
}
