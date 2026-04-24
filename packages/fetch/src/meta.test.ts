import { describe, it, expect } from "vitest";
import { extractMeta } from "./meta";

function head(inner: string): string {
  return `<html><head>${inner}</head><body></body></html>`;
}

describe("extractMeta", () => {
  it("returns nulls and empty objects for empty head", () => {
    const result = extractMeta("<html><head></head></html>");
    expect(result.canonical).toBeNull();
    expect(result.description).toBeNull();
    expect(result.keywords).toBeNull();
    expect(result.robots).toBeNull();
    expect(result.viewport).toBeNull();
    expect(result.og).toEqual({});
    expect(result.twitter).toEqual({});
    expect(result.hreflang).toEqual([]);
  });

  it("extracts canonical from rel=canonical link", () => {
    const result = extractMeta(head(`<link rel="canonical" href="https://example.com/page">`));
    expect(result.canonical).toBe("https://example.com/page");
  });

  it("extracts meta description", () => {
    const result = extractMeta(head(`<meta name="description" content="We build things">`));
    expect(result.description).toBe("We build things");
  });

  it("extracts meta keywords", () => {
    const result = extractMeta(head(`<meta name="keywords" content="ai, seo, tools">`));
    expect(result.keywords).toBe("ai, seo, tools");
  });

  it("extracts meta robots", () => {
    const result = extractMeta(head(`<meta name="robots" content="noindex, nofollow">`));
    expect(result.robots).toBe("noindex, nofollow");
  });

  it("extracts viewport", () => {
    const result = extractMeta(head(`<meta name="viewport" content="width=device-width, initial-scale=1">`));
    expect(result.viewport).toBe("width=device-width, initial-scale=1");
  });

  it("extracts og: properties via property attribute", () => {
    const result = extractMeta(head(`
      <meta property="og:title" content="My Page">
      <meta property="og:description" content="A description">
      <meta property="og:image" content="https://example.com/img.png">
    `));
    expect(result.og.title).toBe("My Page");
    expect(result.og.description).toBe("A description");
    expect(result.og.image).toBe("https://example.com/img.png");
  });

  it("extracts og: properties via name attribute", () => {
    const result = extractMeta(head(`<meta name="og:title" content="My Page">`));
    expect(result.og.title).toBe("My Page");
  });

  it("extracts twitter: properties via name attribute", () => {
    const result = extractMeta(head(`
      <meta name="twitter:card" content="summary_large_image">
      <meta name="twitter:title" content="Tweet Title">
    `));
    expect(result.twitter.card).toBe("summary_large_image");
    expect(result.twitter.title).toBe("Tweet Title");
  });

  it("extracts twitter: properties via property attribute", () => {
    const result = extractMeta(head(`<meta property="twitter:site" content="@acme">`));
    expect(result.twitter.site).toBe("@acme");
  });

  it("extracts hreflang alternates", () => {
    const result = extractMeta(head(`
      <link rel="alternate" hreflang="en" href="https://example.com/en/">
      <link rel="alternate" hreflang="fr" href="https://example.com/fr/">
    `));
    expect(result.hreflang).toHaveLength(2);
    expect(result.hreflang[0]).toEqual({ hreflang: "en", href: "https://example.com/en/" });
    expect(result.hreflang[1]).toEqual({ hreflang: "fr", href: "https://example.com/fr/" });
  });

  it("extracts x-robots-tag from response headers", () => {
    const result = extractMeta("<html></html>", { "x-robots-tag": "noindex" });
    expect(result.xRobotsTag).toBe("noindex");
  });

  it("extracts content-type from response headers", () => {
    const result = extractMeta("<html></html>", { "content-type": "text/html; charset=utf-8" });
    expect(result.contentType).toBe("text/html; charset=utf-8");
  });

  it("extracts strict-transport-security from response headers", () => {
    const result = extractMeta("<html></html>", {
      "strict-transport-security": "max-age=31536000; includeSubDomains",
    });
    expect(result.strictTransportSecurity).toBe("max-age=31536000; includeSubDomains");
  });

  it("normalises header keys to lowercase", () => {
    const result = extractMeta("<html></html>", { "X-Robots-Tag": "noindex" });
    expect(result.xRobotsTag).toBe("noindex");
  });

  it("does not extract tags outside <head>", () => {
    const html = `
      <html>
        <head><meta name="description" content="In head"></head>
        <body><meta name="description" content="In body"></body>
      </html>
    `;
    const result = extractMeta(html);
    expect(result.description).toBe("In head");
  });

  it("handles self-closing meta tags with />", () => {
    const result = extractMeta(head(`<meta name="description" content="Closed" />`));
    expect(result.description).toBe("Closed");
  });

  it("returns null for headers not present", () => {
    const result = extractMeta("<html></html>", {});
    expect(result.xRobotsTag).toBeNull();
    expect(result.contentType).toBeNull();
    expect(result.strictTransportSecurity).toBeNull();
  });
});
