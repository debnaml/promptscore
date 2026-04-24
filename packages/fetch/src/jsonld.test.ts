import { describe, it, expect } from "vitest";
import { extractJsonLd } from "./jsonld";

function wrapScript(json: string): string {
  return `<html><head><script type="application/ld+json">${json}</script></head></html>`;
}

describe("extractJsonLd", () => {
  it("returns empty result for HTML with no JSON-LD", () => {
    const result = extractJsonLd("<html><head></head><body></body></html>");
    expect(result.blocks).toHaveLength(0);
    expect(result.allTypes).toHaveLength(0);
    expect(result.organization).toBeNull();
    expect(result.errors).toHaveLength(0);
  });

  it("parses a single JSON-LD block", () => {
    const html = wrapScript(`{"@context":"https://schema.org","@type":"WebSite","name":"Acme"}`);
    const result = extractJsonLd(html);
    expect(result.blocks).toHaveLength(1);
    expect(result.blocks[0].types).toContain("WebSite");
    expect(result.allTypes).toContain("WebSite");
  });

  it("parses multiple JSON-LD scripts", () => {
    const html = `
      <script type="application/ld+json">{"@type":"WebSite","name":"A"}</script>
      <script type="application/ld+json">{"@type":"Organization","name":"B"}</script>
    `;
    const result = extractJsonLd(html);
    expect(result.blocks).toHaveLength(2);
    expect(result.allTypes).toContain("WebSite");
    expect(result.allTypes).toContain("Organization");
  });

  it("handles @graph array", () => {
    const json = JSON.stringify({
      "@context": "https://schema.org",
      "@graph": [
        { "@type": "WebSite", "name": "Acme" },
        { "@type": "Organization", "name": "Acme Inc" },
      ],
    });
    const result = extractJsonLd(wrapScript(json));
    expect(result.allTypes).toContain("WebSite");
    expect(result.allTypes).toContain("Organization");
  });

  it("handles @type as an array", () => {
    const json = JSON.stringify({ "@type": ["Organization", "LocalBusiness"], "name": "Acme" });
    const result = extractJsonLd(wrapScript(json));
    expect(result.allTypes).toContain("Organization");
    expect(result.allTypes).toContain("LocalBusiness");
  });

  it("records error and skips malformed JSON block, continues parsing others", () => {
    const html = `
      <script type="application/ld+json">THIS IS NOT JSON</script>
      <script type="application/ld+json">{"@type":"WebSite"}</script>
    `;
    const result = extractJsonLd(html);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toMatch(/Failed to parse/);
    expect(result.blocks).toHaveLength(1);
    expect(result.allTypes).toContain("WebSite");
  });

  it("hasType returns true for present types", () => {
    const result = extractJsonLd(wrapScript(`{"@type":"FAQPage"}`));
    expect(result.hasType("FAQPage")).toBe(true);
    expect(result.hasType("Article")).toBe(false);
  });

  it("extracts Organization schema with name, url, description", () => {
    const json = JSON.stringify({
      "@type": "Organization",
      name: "Acme Corp",
      url: "https://acme.com",
      description: "We make things",
      sameAs: ["https://twitter.com/acme"],
    });
    const result = extractJsonLd(wrapScript(json));
    expect(result.organization).not.toBeNull();
    expect(result.organization?.name).toBe("Acme Corp");
    expect(result.organization?.url).toBe("https://acme.com");
    expect(result.organization?.description).toBe("We make things");
    expect(result.organization?.sameAs).toEqual(["https://twitter.com/acme"]);
  });

  it("extracts Organization logo from string", () => {
    const json = JSON.stringify({ "@type": "Organization", logo: "https://acme.com/logo.png" });
    const result = extractJsonLd(wrapScript(json));
    expect(result.organization?.logo).toBe("https://acme.com/logo.png");
  });

  it("extracts Organization logo from ImageObject", () => {
    const json = JSON.stringify({
      "@type": "Organization",
      logo: { "@type": "ImageObject", url: "https://acme.com/logo.png" },
    });
    const result = extractJsonLd(wrapScript(json));
    expect(result.organization?.logo).toBe("https://acme.com/logo.png");
  });

  it("extracts Organization from LocalBusiness type", () => {
    const json = JSON.stringify({ "@type": "LocalBusiness", name: "Corner Shop" });
    const result = extractJsonLd(wrapScript(json));
    expect(result.organization).not.toBeNull();
    expect(result.organization?.name).toBe("Corner Shop");
  });

  it("returns null organization when no Organization type present", () => {
    const result = extractJsonLd(wrapScript(`{"@type":"WebSite","name":"Acme"}`));
    expect(result.organization).toBeNull();
  });

  it("handles top-level JSON array of objects", () => {
    const json = JSON.stringify([
      { "@type": "WebSite", name: "Acme" },
      { "@type": "BreadcrumbList" },
    ]);
    const result = extractJsonLd(wrapScript(json));
    expect(result.allTypes).toContain("WebSite");
    expect(result.allTypes).toContain("BreadcrumbList");
  });

  it("handles sameAs as a single string", () => {
    const json = JSON.stringify({ "@type": "Organization", sameAs: "https://linkedin.com/acme" });
    const result = extractJsonLd(wrapScript(json));
    expect(result.organization?.sameAs).toEqual(["https://linkedin.com/acme"]);
  });

  it("skips empty script blocks", () => {
    const html = `<script type="application/ld+json">   </script>`;
    const result = extractJsonLd(html);
    expect(result.blocks).toHaveLength(0);
    expect(result.errors).toHaveLength(0);
  });
});
