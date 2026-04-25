import type { FetchContext } from "@promptscore/fetch";
import type { Check, CheckResult } from "./types";

export interface RunnerResult {
  key: string;
  category: string;
  type: string;
  weight: number;
  result: CheckResult;
}

export async function runChecks(
  ctx: FetchContext,
  checks: Check[]
): Promise<RunnerResult[]> {
  const results = await Promise.all(
    checks.map(async (check) => {
      let result: CheckResult;
      try {
        result = await check.run(ctx);
      } catch (e) {
        result = {
          score: -1,
          not_scored: true,
          evidence: null,
          notes: `Check threw: ${e instanceof Error ? e.message : String(e)}`,
        };
      }
      return { key: check.key, category: check.category, type: check.type, weight: check.weight, result };
    })
  );

  return results;
}
