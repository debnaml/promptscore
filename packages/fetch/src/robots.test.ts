import { describe, it, expect, vi } from "vitest";
import { fetchRobots, RobotsAnalysis } from "./robots";

// ---- Fixture robots.txt content ----

const ALLOW_ALL = `
User-agent: *
Allow: /
Sitemap: https://example.com/sitemap.xml
`.trim();

const BLOCK_ALL = `
User-agent: *
Disallow: /
`.trim();

const DIFFERENTIATED = `
User-agent: *
Allow: /
Disallow: /admin

User-agent: GPTBot
Disallow: /

User-agent: ClaudeBot
Disallow: /

Sitemap: https://example.com/sitemap.xml
Sitemap: https://example.com/news-sitemap.xml
`.trim();

// Helper to make a fake fetch
function mockFetch(status: number, body: string) {
  return vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    text: async () => body,
  } as Response);
}

function networkErrorFetch() {
  return vi.fn().mockRejectedValue(new Error("fetch failed"));
}

function timeoutFetch() {
  return vi.fn().mockImplementation(
    () => new Promise((_, reject) => setTimeout(() => reject(new Error("AbortError")), 0))
  );
}

// ---- RobotsAnalysis unit tests ----

describe("RobotsAnalysis", () => {
  describe("when robots.txt is absent (null)", () => {
    const analysis = new RobotsAnalysis("https://example.com/robots.txt", null);

    it("isAllowed returns true for any path", () => {
      expect(analysis.isAllowed("*", "/")).toBe(true);
      expect(analysis.isAllowed("GPTBot", "/secret")).toBe(true);
    });

    it("listedUserAgents returns empty array", () => {
      expect(analysis.listedUserAgents()).toEqual([]);
    });

    it("hasExplicitRuleFor returns false", () => {
      expect(analysis.hasExplicitRuleFor("GPTBot")).toBe(false);
    });

    it("sitemapUrls returns empty array", () => {
      expect(analysis.sitemapUrls()).toEqual([]);
    });
  });

  describe("allow-all robots.txt", () => {
    const analysis = new RobotsAnalysis("https://example.com/robots.txt", ALLOW_ALL);

    it("isAllowed * / returns true", () => {
      expect(analysis.isAllowed("*", "/")).toBe(true);
    });

    it("sitemapUrls returns the declared sitemap", () => {
      expect(analysis.sitemapUrls()).toContain("https://example.com/sitemap.xml");
    });

    it("listedUserAgents includes *", () => {
      expect(analysis.listedUserAgents()).toContain("*");
    });

    it("hasExplicitRuleFor non-wildcard agents returns false", () => {
      expect(analysis.hasExplicitRuleFor("GPTBot")).toBe(false);
    });
  });

  describe("block-all robots.txt", () => {
    const analysis = new RobotsAnalysis("https://example.com/robots.txt", BLOCK_ALL);

    it("isAllowed * / returns false", () => {
      expect(analysis.isAllowed("*", "/")).toBe(false);
    });

    it("isAllowed GPTBot / returns false (inherits wildcard)", () => {
      expect(analysis.isAllowed("GPTBot", "/")).toBe(false);
    });
  });

  describe("differentiated robots.txt", () => {
    const analysis = new RobotsAnalysis("https://example.com/robots.txt", DIFFERENTIATED);

    it("isAllowed * /public returns true", () => {
      expect(analysis.isAllowed("*", "/public")).toBe(true);
    });

    it("isAllowed * /admin returns false", () => {
      expect(analysis.isAllowed("*", "/admin")).toBe(false);
    });

    it("isAllowed GPTBot / returns false", () => {
      expect(analysis.isAllowed("GPTBot", "/")).toBe(false);
    });

    it("isAllowed ClaudeBot / returns false", () => {
      expect(analysis.isAllowed("ClaudeBot", "/")).toBe(false);
    });

    it("hasExplicitRuleFor GPTBot returns true", () => {
      expect(analysis.hasExplicitRuleFor("GPTBot")).toBe(true);
    });

    it("hasExplicitRuleFor ClaudeBot returns true", () => {
      expect(analysis.hasExplicitRuleFor("ClaudeBot")).toBe(true);
    });

    it("hasExplicitRuleFor Googlebot returns false", () => {
      expect(analysis.hasExplicitRuleFor("Googlebot")).toBe(false);
    });

    it("listedUserAgents contains all three agents", () => {
      const agents = analysis.listedUserAgents();
      expect(agents).toContain("*");
      expect(agents).toContain("GPTBot");
      expect(agents).toContain("ClaudeBot");
    });

    it("sitemapUrls returns both sitemaps", () => {
      const urls = analysis.sitemapUrls();
      expect(urls).toContain("https://example.com/sitemap.xml");
      expect(urls).toContain("https://example.com/news-sitemap.xml");
    });
  });
});

// ---- fetchRobots integration tests (mocked HTTP) ----

describe("fetchRobots", () => {
  it("returns present=true and populated analysis on 200", async () => {
    const result = await fetchRobots("https://example.com", mockFetch(200, DIFFERENTIATED));
    expect(result.present).toBe(true);
    expect(result.status).toBe(200);
    expect(result.raw).toBe(DIFFERENTIATED);
    expect(result.analysis.hasExplicitRuleFor("GPTBot")).toBe(true);
    expect(result.fetchedAt).toBeInstanceOf(Date);
  });

  it("returns present=false on 404", async () => {
    const result = await fetchRobots("https://example.com", mockFetch(404, "Not found"));
    expect(result.present).toBe(false);
    expect(result.status).toBe(404);
    expect(result.raw).toBeNull();
    expect(result.analysis.isAllowed("*", "/")).toBe(true);
  });

  it("handles network error gracefully (no throw)", async () => {
    const result = await fetchRobots("https://example.com", networkErrorFetch());
    expect(result.present).toBe(false);
    expect(result.status).toBeNull();
    expect(result.raw).toBeNull();
  });

  it("handles timeout gracefully (no throw)", async () => {
    const result = await fetchRobots("https://example.com", timeoutFetch());
    expect(result.present).toBe(false);
    expect(result.status).toBeNull();
  });

  it("constructs robots URL from origin only", async () => {
    const fetchFn = mockFetch(200, ALLOW_ALL);
    await fetchRobots("https://example.com/some/deep/path?foo=bar", fetchFn);
    expect(fetchFn).toHaveBeenCalledWith(
      "https://example.com/robots.txt",
      expect.any(Object)
    );
  });

  it("includes User-Agent header in request", async () => {
    const fetchFn = mockFetch(200, ALLOW_ALL);
    await fetchRobots("https://example.com", fetchFn);
    const [, init] = fetchFn.mock.calls[0] as [string, RequestInit];
    expect((init.headers as Record<string, string>)["User-Agent"]).toMatch(
      /PromptScoreBot/
    );
  });
});
