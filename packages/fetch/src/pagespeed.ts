export interface PageSpeedResult {
  mobile: number | null;
  fetchedAt: Date;
  error?: string;
}

export async function fetchPageSpeed(
  url: string,
  apiKey?: string,
  fetchFn: typeof fetch = globalThis.fetch
): Promise<PageSpeedResult> {
  const fetchedAt = new Date();
  const key = apiKey ?? process.env["PAGESPEED_API_KEY"];

  if (!key) {
    return { mobile: null, fetchedAt, error: "PAGESPEED_API_KEY not set" };
  }

  const endpoint = new URL("https://www.googleapis.com/pagespeedonline/v5/runPagespeed");
  endpoint.searchParams.set("url", url);
  endpoint.searchParams.set("strategy", "mobile");
  endpoint.searchParams.set("key", key);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 30_000);

  try {
    const res = await fetchFn(endpoint.href, { signal: controller.signal });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      if (res.status === 429) {
        return { mobile: null, fetchedAt, error: "PageSpeed API quota exhausted" };
      }
      return { mobile: null, fetchedAt, error: `PageSpeed API error ${res.status}: ${body.slice(0, 200)}` };
    }
    const data = await res.json() as { lighthouseResult?: { categories?: { performance?: { score?: number } } } };
    const score = data.lighthouseResult?.categories?.performance?.score;
    const mobile = typeof score === "number" ? Math.round(score * 100) : null;
    return { mobile, fetchedAt };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    const isTimeout = msg.toLowerCase().includes("abort") || msg.toLowerCase().includes("timeout");
    return { mobile: null, fetchedAt, error: isTimeout ? "PageSpeed request timed out" : msg };
  } finally {
    clearTimeout(timer);
  }
}
