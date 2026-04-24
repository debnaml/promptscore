const USER_AGENT = "PromptScoreBot/1.0 (+https://promptscore.co.uk/about)";
const TIMEOUT_MS = 10_000;
const MAX_REDIRECTS = 3;

export interface StaticFetchSuccess {
  ok: true;
  html: string;
  status: number;
  redirectChain: string[];
  headers: Record<string, string>;
  fetchedAt: Date;
}

export interface StaticFetchError {
  ok: false;
  kind: "http-error" | "timeout" | "dns" | "tls" | "network";
  status: number | null;
  message: string;
  redirectChain: string[];
  fetchedAt: Date;
}

export type StaticFetchResult = StaticFetchSuccess | StaticFetchError;

function classifyError(err: unknown): Pick<StaticFetchError, "kind" | "message"> {
  const msg = err instanceof Error ? err.message : String(err);
  const lower = msg.toLowerCase();
  if (lower.includes("timed out") || lower.includes("timeout") || lower.includes("abort")) {
    return { kind: "timeout", message: "Request timed out" };
  }
  if (
    lower.includes("certificate") ||
    lower.includes("ssl") ||
    lower.includes("tls") ||
    lower.includes("cert")
  ) {
    return { kind: "tls", message: msg };
  }
  if (
    lower.includes("enotfound") ||
    lower.includes("getaddrinfo") ||
    lower.includes("dns") ||
    lower.includes("name or service not known")
  ) {
    return { kind: "dns", message: msg };
  }
  return { kind: "network", message: msg };
}

export async function fetchStatic(
  url: string,
  fetchFn: typeof fetch = globalThis.fetch
): Promise<StaticFetchResult> {
  const fetchedAt = new Date();
  const redirectChain: string[] = [];
  let currentUrl = url;

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

    let response: Response;
    try {
      response = await fetchFn(currentUrl, {
        signal: controller.signal,
        redirect: "manual",
        headers: { "User-Agent": USER_AGENT },
      });
    } finally {
      clearTimeout(timer);
    }

    // Manual redirect following so we can record the chain
    let hops = 0;
    while (
      response.status >= 300 &&
      response.status < 400 &&
      hops < MAX_REDIRECTS
    ) {
      const location = response.headers.get("location");
      if (!location) break;

      redirectChain.push(currentUrl);
      // Resolve relative redirects
      try {
        currentUrl = new URL(location, currentUrl).href;
      } catch {
        currentUrl = location;
      }
      hops++;

      const controller2 = new AbortController();
      const timer2 = setTimeout(() => controller2.abort(), TIMEOUT_MS);
      try {
        response = await fetchFn(currentUrl, {
          signal: controller2.signal,
          redirect: "manual",
          headers: { "User-Agent": USER_AGENT },
        });
      } finally {
        clearTimeout(timer2);
      }
    }

    // Collect response headers
    const headers: Record<string, string> = {};
    response.headers.forEach((value, key) => {
      headers[key] = value;
    });

    if (!response.ok) {
      return {
        ok: false,
        kind: "http-error",
        status: response.status,
        message: `HTTP ${response.status}`,
        redirectChain,
        fetchedAt,
      };
    }

    const html = await response.text();

    return {
      ok: true,
      html,
      status: response.status,
      redirectChain,
      headers,
      fetchedAt,
    };
  } catch (err) {
    const { kind, message } = classifyError(err);
    return {
      ok: false,
      kind,
      status: null,
      message,
      redirectChain,
      fetchedAt,
    };
  }
}
