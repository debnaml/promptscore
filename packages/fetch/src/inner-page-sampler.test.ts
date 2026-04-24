import { describe, it, expect } from "vitest";
import { sampleInnerPages } from "./inner-page-sampler";
import type { SitemapEntry } from "./sitemap";

const SITE = "https://example.com";
const NOW = new Date("2026-04-24T00:00:00Z");
const RECENT = "2026-01-01";
const OLD = "2024-01-01";

function entry(loc: string, lastmod?: string): SitemapEntry {
  return { loc, lastmod };
}

describe("sampleInnerPages", () => {
  it("returns up to 3 pages from sitemap", () => {
    const entries = [
      entry("https://example.com/about"),
      entry("https://example.com/blog/post-1"),
      entry("https://example.com/services/consulting"),
      entry("https://example.com/contact"),
    ];
    const result = sampleInnerPages(SITE, entries, "", NOW);
    expect(result.pages).toHaveLength(3);
    expect(result.warnings).toHaveLength(0);
  });

  it("prefers recently lastmod'd entries first", () => {
    const entries = [
      entry("https://example.com/old-page", OLD),
      entry("https://example.com/blog/new-post", RECENT),
      entry("https://example.com/about", RECENT),
      entry("https://example.com/services", RECENT),
    ];
    const result = sampleInnerPages(SITE, entries, "", NOW);
    const urls = result.pages.map((p) => p.url);
    expect(urls).not.toContain("https://example.com/old-page");
    expect(result.pages.every((p) => p.source === "sitemap")).toBe(true);
  });

  it("falls back to older sitemap entries if recent are insufficient", () => {
    const entries = [
      entry("https://example.com/old-a", OLD),
      entry("https://example.com/old-b", OLD),
    ];
    const result = sampleInnerPages(SITE, entries, "", NOW);
    expect(result.pages).toHaveLength(2);
    expect(result.warnings[0]).toMatch(/Only found 2/);
  });

  it("picks diverse path prefixes (one per top-level segment)", () => {
    const entries = [
      entry("https://example.com/blog/post-1"),
      entry("https://example.com/blog/post-2"),
      entry("https://example.com/blog/post-3"),
      entry("https://example.com/about"),
    ];
    const result = sampleInnerPages(SITE, entries, "", NOW);
    expect(result.pages).toHaveLength(2); // /blog and /about
    const prefixes = result.pages.map((p) => new URL(p.url).pathname.split("/")[1]);
    expect(new Set(prefixes).size).toBe(result.pages.length);
  });

  it("falls back to nav hrefs when sitemap is empty", () => {
    const html = `
      <html><body>
        <nav>
          <a href="/about">About</a>
          <a href="/services">Services</a>
          <a href="/blog">Blog</a>
          <a href="/contact">Contact</a>
        </nav>
      </body></html>
    `;
    const result = sampleInnerPages(SITE, [], html, NOW);
    expect(result.pages).toHaveLength(3);
    expect(result.pages.every((p) => p.source === "nav")).toBe(true);
  });

  it("falls back to main hrefs when nav has no useful links", () => {
    const html = `
      <html><body>
        <main>
          <a href="/features">Features</a>
          <a href="/pricing">Pricing</a>
          <a href="/docs">Docs</a>
        </main>
      </body></html>
    `;
    const result = sampleInnerPages(SITE, [], html, NOW);
    expect(result.pages).toHaveLength(3);
    expect(result.pages.every((p) => p.source === "main")).toBe(true);
  });

  it("excludes the homepage itself", () => {
    const entries = [
      entry("https://example.com/"),
      entry("https://example.com"),
      entry("https://example.com/about"),
    ];
    const result = sampleInnerPages(SITE, entries, "", NOW);
    const urls = result.pages.map((p) => p.url);
    expect(urls).not.toContain("https://example.com/");
    expect(urls).not.toContain("https://example.com");
  });

  it("excludes external links", () => {
    const html = `
      <nav>
        <a href="https://external.com/page">External</a>
        <a href="/internal">Internal</a>
      </nav>
    `;
    const result = sampleInnerPages(SITE, [], html, NOW);
    const urls = result.pages.map((p) => p.url);
    expect(urls).not.toContain("https://external.com/page");
    expect(urls.some((u) => u.includes("internal"))).toBe(true);
  });

  it("warns when no pages found at all", () => {
    const result = sampleInnerPages(SITE, [], "", NOW);
    expect(result.pages).toHaveLength(0);
    expect(result.warnings[0]).toMatch(/Could not find/);
  });

  it("warns when fewer than 3 pages found", () => {
    const result = sampleInnerPages(SITE, [entry("https://example.com/only-one")], "", NOW);
    expect(result.pages).toHaveLength(1);
    expect(result.warnings[0]).toMatch(/Only found 1/);
  });

  it("deduplicates URLs", () => {
    const entries = [
      entry("https://example.com/about"),
      entry("https://example.com/about"),
      entry("https://example.com/about"),
    ];
    const result = sampleInnerPages(SITE, entries, "", NOW);
    expect(result.pages).toHaveLength(1);
  });

  it("handles invalid siteUrl gracefully", () => {
    const result = sampleInnerPages("not-a-url", [], "", NOW);
    expect(result.pages).toHaveLength(0);
    expect(result.warnings[0]).toMatch(/Invalid siteUrl/);
  });

  it("resolves relative hrefs against origin", () => {
    const html = `<nav><a href="/about">About</a></nav>`;
    const result = sampleInnerPages("https://example.com/some/path", [], html, NOW);
    expect(result.pages[0].url).toBe("https://example.com/about");
  });

  it("skips fragment-only hrefs", () => {
    const html = `
      <nav>
        <a href="#section">Skip</a>
        <a href="/about">About</a>
      </nav>
    `;
    const result = sampleInnerPages(SITE, [], html, NOW);
    expect(result.pages[0].url).toBe("https://example.com/about");
  });

  it("uses sitemap before nav when both available", () => {
    const entries = [entry("https://example.com/sitemap-page")];
    const html = `<nav><a href="/nav-page">Nav</a><a href="/nav-page2">Nav2</a></nav>`;
    const result = sampleInnerPages(SITE, entries, html, NOW);
    const urls = result.pages.map((p) => p.url);
    expect(urls[0]).toBe("https://example.com/sitemap-page");
  });
});
