import robotsParser from "robots-parser";

const FETCH_TIMEOUT_MS = 5_000;
const ROBOTS_USER_AGENT = "PromptScoreBot/1.0";

export interface RobotsResult {
  analysis: RobotsAnalysis;
  /** HTTP status code, or 0 for network errors, null if not fetched */
  status: number | null;
  /** Whether the file was present (200 OK) */
  present: boolean;
  raw: string | null;
  fetchedAt: Date;
}

export class RobotsAnalysis {
  /** Raw content of robots.txt, or null if absent */
  readonly raw: string | null;

  private readonly _parser: ReturnType<typeof robotsParser> | null;
  private readonly _userAgents: string[];
  private readonly _sitemapUrls: string[];

  constructor(robotsTxtUrl: string, raw: string | null) {
    this.raw = raw;

    if (raw === null || raw.trim() === "") {
      this._parser = null;
      this._userAgents = [];
      this._sitemapUrls = [];
      return;
    }

    this._parser = robotsParser(robotsTxtUrl, raw);
    this._sitemapUrls = this._parser.getSitemaps();

    // Extract all User-agent lines from raw content
    const agents = new Set<string>();
    for (const line of raw.split(/\r?\n/)) {
      const match = /^user-agent:\s*(.+)/i.exec(line.trim());
      if (match) agents.add(match[1].trim());
    }
    this._userAgents = Array.from(agents);
  }

  /**
   * Check whether the given path is allowed for the given user-agent.
   * If robots.txt is absent or empty, everything is allowed.
   */
  isAllowed(userAgent: string, path: string): boolean {
    if (!this._parser) return true;
    // robots-parser expects a full URL; construct one from path
    const fakeBase = "https://example.com";
    const url = path.startsWith("http") ? path : `${fakeBase}${path.startsWith("/") ? "" : "/"}${path}`;
    return this._parser.isAllowed(url, userAgent) ?? true;
  }

  /**
   * Every user-agent name found in the file (empty if no robots.txt).
   */
  listedUserAgents(): string[] {
    return [...this._userAgents];
  }

  /**
   * Whether there is an explicit block/rule for the given user-agent name
   * (case-insensitive, not counting wildcard *).
   */
  hasExplicitRuleFor(userAgent: string): boolean {
    return this._userAgents.some(
      (a) => a.toLowerCase() === userAgent.toLowerCase() && a !== "*"
    );
  }

  /**
   * All Sitemap: URLs declared in robots.txt.
   */
  sitemapUrls(): string[] {
    return [...this._sitemapUrls];
  }
}

/**
 * Fetch and parse robots.txt for a given origin URL.
 *
 * Never throws — network/parse errors are captured in the result.
 */
export async function fetchRobots(
  siteUrl: string,
  fetchFn: typeof fetch = globalThis.fetch
): Promise<RobotsResult> {
  const origin = new URL(siteUrl).origin;
  const robotsUrl = `${origin}/robots.txt`;
  const fetchedAt = new Date();

  let status: number | null = null;
  let raw: string | null = null;
  let present = false;

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    let response: Response;
    try {
      response = await fetchFn(robotsUrl, {
        signal: controller.signal,
        headers: { "User-Agent": ROBOTS_USER_AGENT },
      });
    } finally {
      clearTimeout(timer);
    }

    status = response.status;

    if (response.ok) {
      raw = await response.text();
      present = true;
    }
  } catch {
    // Network error, timeout, DNS failure — raw stays null
  }

  const analysis = new RobotsAnalysis(robotsUrl, raw);
  return { analysis, status, present, raw, fetchedAt };
}
