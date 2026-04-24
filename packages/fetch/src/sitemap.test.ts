import { describe, it, expect, vi } from "vitest";
import { fetchSitemap } from "./sitemap";

// ---- XML Fixtures ----

const STANDARD_SITEMAP = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>https://example.com/</loc><lastmod>2026-01-01</lastmod></url>
  <url><loc>https://example.com/about</loc><lastmod>2026-01-02</lastmod></url>
  <url><loc>https://example.com/blog</loc></url>
</urlset>`;

const SITEMAP_INDEX = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap><loc>https://example.com/sitemap-pages.xml</loc></sitemap>
  <sitemap><loc>https://example.com/sitemap-posts.xml</loc></sitemap>
</sitemapindex>`;

const CHILD_SITEMAP_1 = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>https://example.com/page-1</loc></url>
  <url><loc>https://example.com/page-2</loc></url>
</urlset>`;

const CHILD_SITEMAP_2 = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>https://example.com/post-1</loc><lastmod>2026-03-01</lastmod></url>
</urlset>`;

const MALFORMED_XML = `<urlset><url><loc>not-closed`;
const EMPTY_SITEMAP = `<?xml version="1.0"?><urlset></urlset>`;

// ---- Mock fetch factory ----

function makeFetch(responses: Record<string, { status: number; body: string }>) {
  return vi.fn().mockImplementation(async (url: string) => {
    const resp = responses[url];
    if (!resp) return { ok: false, status: 404, text: async () => "" };
    return {
      ok: resp.status >= 200 && resp.status < 300,
      status: resp.status,
      text: async () => resp.body,
    };
  });
}

// ---- Tests ----

describe("fetchSitemap", () => {
  it("returns present=true and entries from a standard sitemap", async () => {
    const fetch = makeFetch({
      "https://example.com/sitemap.xml": { status: 200, body: STANDARD_SITEMAP },
    });
    const { analysis } = await fetchSitemap("https://example.com", { fetchFn: fetch });

    expect(analysis.present).toBe(true);
    expect(analysis.sourceUrl).toBe("https://example.com/sitemap.xml");
    expect(analysis.entries).toHaveLength(3);
    expect(analysis.entries[0].loc).toBe("https://example.com/");
    expect(analysis.entries[0].lastmod).toBe("2026-01-01");
    expect(analysis.entries[2].lastmod).toBeUndefined();
  });

  it("follows sitemap index and collects child URLs", async () => {
    const fetch = makeFetch({
      "https://example.com/sitemap.xml": { status: 200, body: SITEMAP_INDEX },
      "https://example.com/sitemap-pages.xml": { status: 200, body: CHILD_SITEMAP_1 },
      "https://example.com/sitemap-posts.xml": { status: 200, body: CHILD_SITEMAP_2 },
    });
    const { analysis } = await fetchSitemap("https://example.com", { fetchFn: fetch });

    expect(analysis.present).toBe(true);
    expect(analysis.entries).toHaveLength(3);
    const locs = analysis.entries.map((e) => e.loc);
    expect(locs).toContain("https://example.com/page-1");
    expect(locs).toContain("https://example.com/post-1");
  });

  it("falls back to /sitemap_index.xml when /sitemap.xml 404s", async () => {
    const fetch = makeFetch({
      "https://example.com/sitemap.xml": { status: 404, body: "" },
      "https://example.com/sitemap_index.xml": { status: 200, body: STANDARD_SITEMAP },
    });
    const { analysis } = await fetchSitemap("https://example.com", { fetchFn: fetch });

    expect(analysis.sourceUrl).toBe("https://example.com/sitemap_index.xml");
    expect(analysis.entries).toHaveLength(3);
  });

  it("falls back to /sitemap-index.xml as third option", async () => {
    const fetch = makeFetch({
      "https://example.com/sitemap.xml": { status: 404, body: "" },
      "https://example.com/sitemap_index.xml": { status: 404, body: "" },
      "https://example.com/sitemap-index.xml": { status: 200, body: STANDARD_SITEMAP },
    });
    const { analysis } = await fetchSitemap("https://example.com", { fetchFn: fetch });

    expect(analysis.sourceUrl).toBe("https://example.com/sitemap-index.xml");
  });

  it("prioritises robots.txt sitemap URL over fallbacks", async () => {
    const fetch = makeFetch({
      "https://example.com/custom-sitemap.xml": { status: 200, body: STANDARD_SITEMAP },
      "https://example.com/sitemap.xml": { status: 200, body: CHILD_SITEMAP_2 },
    });
    const { analysis } = await fetchSitemap("https://example.com", {
      fetchFn: fetch,
      robotsSitemapUrls: ["https://example.com/custom-sitemap.xml"],
    });

    expect(analysis.sourceUrl).toBe("https://example.com/custom-sitemap.xml");
  });

  it("returns present=false when all candidates 404", async () => {
    const fetch = makeFetch({});
    const { analysis } = await fetchSitemap("https://example.com", { fetchFn: fetch });

    expect(analysis.present).toBe(false);
    expect(analysis.sourceUrl).toBeNull();
    expect(analysis.entries).toHaveLength(0);
  });

  it("handles malformed XML gracefully (no throw)", async () => {
    const fetch = makeFetch({
      "https://example.com/sitemap.xml": { status: 200, body: MALFORMED_XML },
    });
    const { analysis } = await fetchSitemap("https://example.com", { fetchFn: fetch });

    expect(analysis.present).toBe(false);
    expect(analysis.entries).toHaveLength(0);
  });

  it("handles network error gracefully (no throw)", async () => {
    const fetch = vi.fn().mockRejectedValue(new Error("network fail"));
    const { analysis } = await fetchSitemap("https://example.com", { fetchFn: fetch });

    expect(analysis.present).toBe(false);
  });

  it("caps at 1000 entries", async () => {
    const many = Array.from({ length: 1200 }, (_, i) =>
      `<url><loc>https://example.com/page-${i}</loc></url>`
    ).join("\n");
    const bigSitemap = `<?xml version="1.0"?><urlset>${many}</urlset>`;
    const fetch = makeFetch({
      "https://example.com/sitemap.xml": { status: 200, body: bigSitemap },
    });
    const { analysis } = await fetchSitemap("https://example.com", { fetchFn: fetch });

    expect(analysis.entries.length).toBeLessThanOrEqual(1000);
  });

  it("deduplicates robots.txt URL if same as fallback", async () => {
    const fetchFn = makeFetch({
      "https://example.com/sitemap.xml": { status: 200, body: STANDARD_SITEMAP },
    });
    await fetchSitemap("https://example.com", {
      fetchFn,
      robotsSitemapUrls: ["https://example.com/sitemap.xml"],
    });
    // /sitemap.xml should only be requested once
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });

  it("sets fetchedAt to a recent Date", async () => {
    const before = Date.now();
    const fetch = makeFetch({});
    const { fetchedAt } = await fetchSitemap("https://example.com", { fetchFn: fetch });

    expect(fetchedAt.getTime()).toBeGreaterThanOrEqual(before);
    expect(fetchedAt.getTime()).toBeLessThanOrEqual(Date.now());
  });

  it("handles empty urlset (no entries, not present)", async () => {
    const fetch = makeFetch({
      "https://example.com/sitemap.xml": { status: 200, body: EMPTY_SITEMAP },
    });
    const { analysis } = await fetchSitemap("https://example.com", { fetchFn: fetch });

    expect(analysis.present).toBe(false);
    expect(analysis.entries).toHaveLength(0);
  });
});
