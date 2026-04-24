const FETCH_TIMEOUT_MS = 10_000;
const LLMS_UA = "PromptScoreBot/1.0";

export interface LlmsTxtAnalysis {
  /** Whether /llms.txt exists and returned 200 */
  present: boolean;
  /** Whether the file is valid per the minimal llmstxt.org spec */
  valid: boolean;
  raw: string | null;
  /** /llms-full.txt if present */
  fullRaw: string | null;
  errors: string[];
}

export interface LlmsTxtResult {
  analysis: LlmsTxtAnalysis;
  fetchedAt: Date;
}

/**
 * Validate llms.txt content against the minimal spec from llmstxt.org:
 * - Must start with a `# ` header line (H1)
 * - Sections delimited by `## `
 * - Non-empty
 */
export function validateLlmsTxt(raw: string): string[] {
  const errors: string[] = [];
  const trimmed = raw.trim();

  if (trimmed === "") {
    errors.push("File is empty");
    return errors;
  }

  const lines = trimmed.split(/\r?\n/);
  const firstContentLine = lines.find((l) => l.trim() !== "");

  if (!firstContentLine?.startsWith("# ")) {
    errors.push(
      "File must start with a H1 header line (e.g. `# My Company`)"
    );
  }

  // Must have at least one non-empty line after the header
  const nonHeaderLines = lines.filter(
    (l, i) => i > 0 && l.trim() !== ""
  );
  if (nonHeaderLines.length === 0) {
    errors.push("File must contain content beyond the H1 header");
  }

  return errors;
}

async function tryFetch(
  url: string,
  fetchFn: typeof fetch
): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    let res: Response;
    try {
      res = await fetchFn(url, {
        signal: controller.signal,
        headers: { "User-Agent": LLMS_UA },
      });
    } finally {
      clearTimeout(timer);
    }
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

/**
 * Fetch /llms.txt and (if present) /llms-full.txt for a given site.
 * Never throws.
 */
export async function fetchLlmsTxt(
  siteUrl: string,
  fetchFn: typeof fetch = globalThis.fetch
): Promise<LlmsTxtResult> {
  const origin = new URL(siteUrl).origin;
  const fetchedAt = new Date();

  const [raw, fullRaw] = await Promise.all([
    tryFetch(`${origin}/llms.txt`, fetchFn),
    tryFetch(`${origin}/llms-full.txt`, fetchFn),
  ]);

  const errors = raw !== null ? validateLlmsTxt(raw) : [];

  return {
    analysis: {
      present: raw !== null,
      valid: raw !== null && errors.length === 0,
      raw,
      fullRaw,
      errors,
    },
    fetchedAt,
  };
}
