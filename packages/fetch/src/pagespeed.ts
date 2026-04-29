export interface PageSpeedResult {
  mobile: number | null;
  fetchedAt: Date;
  error?: string;
}

function fetchWithNodeHttps(url: string, signal: AbortSignal): Promise<{ ok: boolean; status: number; text: () => Promise<string>; json: () => Promise<unknown> }> {
  return new Promise((resolve, reject) => {
    import("node:https").then(({ request }) => {
      const parsed = new URL(url);
      const chunks: Buffer[] = [];
      const req = request(
        { hostname: parsed.hostname, path: parsed.pathname + parsed.search, method: "GET" },
        (res) => {
          res.on("data", (chunk: Buffer) => chunks.push(chunk));
          res.on("end", () => {
            const body = Buffer.concat(chunks).toString("utf8");
            const status = res.statusCode ?? 0;
            resolve({
              ok: status >= 200 && status < 300,
              status,
              text: () => Promise.resolve(body),
              json: () => Promise.resolve(JSON.parse(body)),
            });
          });
          res.on("error", reject);
        }
      );
      req.on("error", reject);
      signal.addEventListener("abort", () => { req.destroy(); reject(new Error("AbortError")); });
      req.end();
    }).catch(reject);
  });
}

export async function fetchPageSpeed(
  url: string,
  apiKey?: string,
  _fetchFn: typeof fetch = globalThis.fetch
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
  const timer = setTimeout(() => controller.abort(), 55_000);

  try {
    const res = await fetchWithNodeHttps(endpoint.href, controller.signal);
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
    const isTimeout = msg.toLowerCase().includes("abort") || msg.toLowerCase().includes("AbortError") || msg.toLowerCase().includes("timeout");
    return { mobile: null, fetchedAt, error: isTimeout ? "PageSpeed request timed out after 55s" : msg };
  } finally {
    clearTimeout(timer);
  }
}
