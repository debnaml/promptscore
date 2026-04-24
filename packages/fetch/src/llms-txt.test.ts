import { describe, it, expect, vi } from "vitest";
import { fetchLlmsTxt, validateLlmsTxt } from "./llms-txt";

// ---- Fixtures ----

const VALID_LLMS = `# PerformancePeak
> We help businesses grow through data-driven marketing.

## Services
- [SEO](https://performancepeak.co.uk/seo): Search engine optimisation
- [PPC](https://performancepeak.co.uk/ppc): Pay-per-click advertising

## About
We are a team of specialists based in the UK.
`;

const VALID_MINIMAL = `# My Company
A brief description.
`;

const MISSING_H1 = `## Services
Some content here
`;

const EMPTY_FILE = `   `;

const HEADER_ONLY = `# My Company
`;

// ---- Mock helpers ----

function makeFetch(responses: Record<string, string | null>) {
  return vi.fn().mockImplementation(async (url: string) => {
    const body = responses[url];
    if (body === null || body === undefined) {
      return { ok: false, status: 404, text: async () => "" };
    }
    return { ok: true, status: 200, text: async () => body };
  });
}

// ---- validateLlmsTxt unit tests ----

describe("validateLlmsTxt", () => {
  it("returns no errors for a valid file", () => {
    expect(validateLlmsTxt(VALID_LLMS)).toEqual([]);
  });

  it("returns no errors for a minimal valid file", () => {
    expect(validateLlmsTxt(VALID_MINIMAL)).toEqual([]);
  });

  it("errors on empty file", () => {
    const errs = validateLlmsTxt(EMPTY_FILE);
    expect(errs.length).toBeGreaterThan(0);
    expect(errs[0]).toMatch(/empty/i);
  });

  it("errors when first content line is not H1", () => {
    const errs = validateLlmsTxt(MISSING_H1);
    expect(errs.some((e) => /H1|header/i.test(e))).toBe(true);
  });

  it("errors when only H1 with no further content", () => {
    const errs = validateLlmsTxt(HEADER_ONLY);
    expect(errs.some((e) => /content/i.test(e))).toBe(true);
  });
});

// ---- fetchLlmsTxt tests ----

describe("fetchLlmsTxt", () => {
  it("returns present=true, valid=true for a valid llms.txt", async () => {
    const fetch = makeFetch({
      "https://example.com/llms.txt": VALID_LLMS,
      "https://example.com/llms-full.txt": null,
    });
    const { analysis } = await fetchLlmsTxt("https://example.com", fetch);

    expect(analysis.present).toBe(true);
    expect(analysis.valid).toBe(true);
    expect(analysis.raw).toBe(VALID_LLMS);
    expect(analysis.errors).toHaveLength(0);
    expect(analysis.fullRaw).toBeNull();
  });

  it("fetches llms-full.txt when present", async () => {
    const fetch = makeFetch({
      "https://example.com/llms.txt": VALID_LLMS,
      "https://example.com/llms-full.txt": VALID_LLMS + "\n## Extra\nMore detail.",
    });
    const { analysis } = await fetchLlmsTxt("https://example.com", fetch);

    expect(analysis.fullRaw).not.toBeNull();
    expect(analysis.fullRaw).toContain("Extra");
  });

  it("returns present=false when llms.txt is 404", async () => {
    const fetch = makeFetch({
      "https://example.com/llms.txt": null,
      "https://example.com/llms-full.txt": null,
    });
    const { analysis } = await fetchLlmsTxt("https://example.com", fetch);

    expect(analysis.present).toBe(false);
    expect(analysis.valid).toBe(false);
    expect(analysis.raw).toBeNull();
    expect(analysis.errors).toHaveLength(0);
  });

  it("returns present=true, valid=false for invalid llms.txt", async () => {
    const fetch = makeFetch({
      "https://example.com/llms.txt": MISSING_H1,
      "https://example.com/llms-full.txt": null,
    });
    const { analysis } = await fetchLlmsTxt("https://example.com", fetch);

    expect(analysis.present).toBe(true);
    expect(analysis.valid).toBe(false);
    expect(analysis.errors.length).toBeGreaterThan(0);
  });

  it("handles network error gracefully", async () => {
    const fetch = vi.fn().mockRejectedValue(new Error("network fail"));
    const { analysis } = await fetchLlmsTxt("https://example.com", fetch);

    expect(analysis.present).toBe(false);
    expect(analysis.valid).toBe(false);
  });

  it("uses only origin (strips path/query from siteUrl)", async () => {
    const fetch = makeFetch({
      "https://example.com/llms.txt": VALID_LLMS,
      "https://example.com/llms-full.txt": null,
    });
    await fetchLlmsTxt("https://example.com/some/page?foo=bar", fetch);

    expect(fetch).toHaveBeenCalledWith(
      "https://example.com/llms.txt",
      expect.any(Object)
    );
  });

  it("fetches both files in parallel", async () => {
    const calls: string[] = [];
    const fetch = vi.fn().mockImplementation(async (url: string) => {
      calls.push(url);
      return { ok: false, status: 404, text: async () => "" };
    });
    await fetchLlmsTxt("https://example.com", fetch);

    expect(calls).toContain("https://example.com/llms.txt");
    expect(calls).toContain("https://example.com/llms-full.txt");
    expect(calls).toHaveLength(2);
  });

  it("sets fetchedAt to a recent Date", async () => {
    const before = Date.now();
    const fetch = makeFetch({ "https://example.com/llms.txt": null, "https://example.com/llms-full.txt": null });
    const { fetchedAt } = await fetchLlmsTxt("https://example.com", fetch);

    expect(fetchedAt.getTime()).toBeGreaterThanOrEqual(before);
  });
});
