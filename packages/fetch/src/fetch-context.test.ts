import { describe, it, expect, vi } from "vitest";
import { buildFetchContext } from "./fetch-context";

const HOMEPAGE_HTML = `
<html>
<head>
  <title>Acme Corp</title>
  <meta name="description" content="We build great things">
  <meta name="robots" content="index, follow">
  <link rel="canonical" href="https://example.com/">
  <script type="application/ld+json">{"@type":"Organization","name":"Acme Corp","url":"https://example.com"}</script>
</head>
<body>
  <header><nav><a href="/about">About</a><a href="/services">Services</a><a href="/blog">Blog</a></nav></header>
  <main>
    <h1>Welcome to Acme</h1>
    <h2>Our Services</h2>
    <p>We provide excellent solutions for your business needs.</p>
    <a href="https://twitter.com/acme">Follow us</a>
  </main>
  <footer>Footer</footer>
</body>
</html>
`;

const ROBOTS_TXT = `User-agent: *\nAllow: /\nSitemap: https://example.com/sitemap.xml\n`;

const SITEMAP_XML = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>https://example.com/about</loc><lastmod>2026-01-01</lastmod></url>
  <url><loc>https://example.com/services</loc><lastmod>2026-01-01</lastmod></url>
  <url><loc>https://example.com/blog</loc><lastmod>2026-01-01</lastmod></url>
</urlset>`;

const INNER_HTML = `<html><body><h1>Inner Page</h1><p>Content here with some words.</p></body></html>`;

function makeFetch(responses: Record<string, { status: number; body: string; headers?: Record<string, string> }>) {
  return vi.fn(async (url: string, _opts?: RequestInit): Promise<Response> => {
    const entry = responses[url] ?? { status: 404, body: "" };
    const headers = new Headers(entry.headers ?? { "content-type": "text/html" });
    return {
      ok: entry.status >= 200 && entry.status < 300,
      status: entry.status,
      headers,
      text: async () => entry.body,
    } as Response;
  });
}

describe("buildFetchContext", () => {
  it("returns a populated FetchContext for a well-behaved site", async () => {
    const fetch = makeFetch({
      "https://example.com/robots.txt": { status: 200, body: ROBOTS_TXT },
      "https://example.com/sitemap.xml": { status: 200, body: SITEMAP_XML, headers: { "content-type": "application/xml" } },
      "https://example.com/llms.txt": { status: 404, body: "" },
      "https://example.com/llms-full.txt": { status: 404, body: "" },
      "https://example.com": { status: 200, body: HOMEPAGE_HTML },
      "https://example.com/about": { status: 200, body: INNER_HTML },
      "https://example.com/services": { status: 200, body: INNER_HTML },
      "https://example.com/blog": { status: 200, body: INNER_HTML },
    });

    const ctx = await buildFetchContext("https://example.com", fetch as unknown as typeof globalThis.fetch);

    expect(ctx.input.canonical).toBe("https://example.com");
    expect(ctx.input.urlHash).toHaveLength(64);
    expect(ctx.fetchedAt).toBeInstanceOf(Date);
    expect(ctx.errors).toHaveLength(0);
  });

  it("populates robots analysis", async () => {
    const fetch = makeFetch({
      "https://example.com/robots.txt": { status: 200, body: ROBOTS_TXT },
      "https://example.com/sitemap.xml": { status: 404, body: "" },
      "https://example.com/sitemap_index.xml": { status: 404, body: "" },
      "https://example.com/sitemap-index.xml": { status: 404, body: "" },
      "https://example.com/llms.txt": { status: 404, body: "" },
      "https://example.com/llms-full.txt": { status: 404, body: "" },
      "https://example.com": { status: 200, body: HOMEPAGE_HTML },
    });

    const ctx = await buildFetchContext("https://example.com", fetch as unknown as typeof globalThis.fetch);
    expect(ctx.robots.isAllowed("Googlebot", "/")).toBe(true);
  });

  it("populates sitemap analysis", async () => {
    const fetch = makeFetch({
      "https://example.com/robots.txt": { status: 404, body: "" },
      "https://example.com/sitemap.xml": { status: 200, body: SITEMAP_XML, headers: { "content-type": "application/xml" } },
      "https://example.com/llms.txt": { status: 404, body: "" },
      "https://example.com/llms-full.txt": { status: 404, body: "" },
      "https://example.com": { status: 200, body: HOMEPAGE_HTML },
      "https://example.com/about": { status: 200, body: INNER_HTML },
      "https://example.com/services": { status: 200, body: INNER_HTML },
      "https://example.com/blog": { status: 200, body: INNER_HTML },
    });

    const ctx = await buildFetchContext("https://example.com", fetch as unknown as typeof globalThis.fetch);
    expect(ctx.sitemap.present).toBe(true);
    expect(ctx.sitemap.entries.length).toBeGreaterThan(0);
  });

  it("populates homepage JSON-LD", async () => {
    const fetch = makeFetch({
      "https://example.com/robots.txt": { status: 404, body: "" },
      "https://example.com/sitemap.xml": { status: 404, body: "" },
      "https://example.com/sitemap_index.xml": { status: 404, body: "" },
      "https://example.com/sitemap-index.xml": { status: 404, body: "" },
      "https://example.com/llms.txt": { status: 404, body: "" },
      "https://example.com/llms-full.txt": { status: 404, body: "" },
      "https://example.com": { status: 200, body: HOMEPAGE_HTML },
    });

    const ctx = await buildFetchContext("https://example.com", fetch as unknown as typeof globalThis.fetch);
    expect(ctx.homepage.jsonLd.hasType("Organization")).toBe(true);
    expect(ctx.homepage.jsonLd.organization?.name).toBe("Acme Corp");
  });

  it("populates homepage meta tags", async () => {
    const fetch = makeFetch({
      "https://example.com/robots.txt": { status: 404, body: "" },
      "https://example.com/sitemap.xml": { status: 404, body: "" },
      "https://example.com/sitemap_index.xml": { status: 404, body: "" },
      "https://example.com/sitemap-index.xml": { status: 404, body: "" },
      "https://example.com/llms.txt": { status: 404, body: "" },
      "https://example.com/llms-full.txt": { status: 404, body: "" },
      "https://example.com": { status: 200, body: HOMEPAGE_HTML },
    });

    const ctx = await buildFetchContext("https://example.com", fetch as unknown as typeof globalThis.fetch);
    expect(ctx.homepage.meta.description).toBe("We build great things");
    expect(ctx.homepage.meta.canonical).toBe("https://example.com/");
  });

  it("populates homepage semantic structure", async () => {
    const fetch = makeFetch({
      "https://example.com/robots.txt": { status: 404, body: "" },
      "https://example.com/sitemap.xml": { status: 404, body: "" },
      "https://example.com/sitemap_index.xml": { status: 404, body: "" },
      "https://example.com/sitemap-index.xml": { status: 404, body: "" },
      "https://example.com/llms.txt": { status: 404, body: "" },
      "https://example.com/llms-full.txt": { status: 404, body: "" },
      "https://example.com": { status: 200, body: HOMEPAGE_HTML },
    });

    const ctx = await buildFetchContext("https://example.com", fetch as unknown as typeof globalThis.fetch);
    expect(ctx.homepage.semantic.headings[0].text).toBe("Welcome to Acme");
    expect(ctx.homepage.semantic.landmarks.main).toBe(1);
    expect(ctx.homepage.semantic.externalLinks).toBeGreaterThan(0);
  });

  it("fetches and parses inner pages from sitemap", async () => {
    const fetch = makeFetch({
      "https://example.com/robots.txt": { status: 404, body: "" },
      "https://example.com/sitemap.xml": { status: 200, body: SITEMAP_XML, headers: { "content-type": "application/xml" } },
      "https://example.com/llms.txt": { status: 404, body: "" },
      "https://example.com/llms-full.txt": { status: 404, body: "" },
      "https://example.com": { status: 200, body: HOMEPAGE_HTML },
      "https://example.com/about": { status: 200, body: INNER_HTML },
      "https://example.com/services": { status: 200, body: INNER_HTML },
      "https://example.com/blog": { status: 200, body: INNER_HTML },
    });

    const ctx = await buildFetchContext("https://example.com", fetch as unknown as typeof globalThis.fetch);
    expect(ctx.innerPages.length).toBeGreaterThan(0);
    expect(ctx.innerPages[0].semantic.headings[0].text).toBe("Inner Page");
  });

  it("captures DNS error in errors array without throwing", async () => {
    const fetch = vi.fn(async () => {
      throw Object.assign(new Error("getaddrinfo ENOTFOUND nonexistent.example"), { code: "ENOTFOUND" });
    });

    const ctx = await buildFetchContext(
      "https://nonexistent.example",
      fetch as unknown as typeof globalThis.fetch
    );

    expect(ctx.errors.length).toBeGreaterThan(0);
    expect(ctx.errors.some((e) => e.toLowerCase().includes("fetch") || e.toLowerCase().includes("error"))).toBe(true);
  });

  it("returns empty inner pages when sitemap and homepage nav yield nothing", async () => {
    const emptyHtml = "<html><head></head><body><h1>Hello</h1></body></html>";
    const fetch = makeFetch({
      "https://example.com/robots.txt": { status: 404, body: "" },
      "https://example.com/sitemap.xml": { status: 404, body: "" },
      "https://example.com/sitemap_index.xml": { status: 404, body: "" },
      "https://example.com/sitemap-index.xml": { status: 404, body: "" },
      "https://example.com/llms.txt": { status: 404, body: "" },
      "https://example.com/llms-full.txt": { status: 404, body: "" },
      "https://example.com": { status: 200, body: emptyHtml },
    });

    const ctx = await buildFetchContext("https://example.com", fetch as unknown as typeof globalThis.fetch);
    expect(ctx.innerPages).toHaveLength(0);
    expect(ctx.warnings.some((w) => w.includes("inner pages"))).toBe(true);
  });

  it("botProbes is empty object (populated in sprint 3)", async () => {
    const fetch = makeFetch({
      "https://example.com/robots.txt": { status: 404, body: "" },
      "https://example.com/sitemap.xml": { status: 404, body: "" },
      "https://example.com/sitemap_index.xml": { status: 404, body: "" },
      "https://example.com/sitemap-index.xml": { status: 404, body: "" },
      "https://example.com/llms.txt": { status: 404, body: "" },
      "https://example.com/llms-full.txt": { status: 404, body: "" },
      "https://example.com": { status: 200, body: HOMEPAGE_HTML },
    });

    const ctx = await buildFetchContext("https://example.com", fetch as unknown as typeof globalThis.fetch);
    expect(ctx.botProbes).toEqual({});
  });
});
