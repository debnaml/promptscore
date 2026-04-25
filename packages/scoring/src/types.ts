import type { FetchContext } from "@promptscore/fetch";

export type CheckCategory =
  | "crawler_access"
  | "structured_data"
  | "content_clarity"
  | "ai_specific"
  | "authority_trust";

export type CheckType = "D" | "DC" | "A";

export interface CheckResult {
  score: number; // 0, 0.5, or 1 for D; any [0,1] for DC/A; or -1 if not_scored
  not_scored: boolean;
  evidence: unknown;
  notes?: string;
}

export interface Check {
  key: string;
  category: CheckCategory;
  type: CheckType;
  weight: number;
  run(ctx: FetchContext): Promise<CheckResult> | CheckResult;
}

export function notScored(notes: string, evidence?: unknown): CheckResult {
  return { score: -1, not_scored: true, evidence: evidence ?? null, notes };
}

export function scored(
  score: number,
  evidence: unknown,
  notes?: string
): CheckResult {
  return { score, not_scored: false, evidence, notes };
}
