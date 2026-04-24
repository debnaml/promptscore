import { describe, it, expect, vi } from "vitest";
import { fetchStatic } from "./static-fetch";
import type { StaticFetchResult } from "./static-fetch";

function mockFetch(responses: Array<{ status: number; headers?: Record<string, string>; body?: string }>) {
  let call = 0;
  return vi.fn(async (_url: string, _opts?: RequestInit): Promise<Response> => {
    const res = responses[Math.min(call++, responses.length - 1)];
    const headerMap = new Headers(res.headers ?? {});
    return {
      ok: res.status >= 200 && res.status < 300,
      status: res.status,
      headers: headerMap,
      text: async () => res.body ?? "",
    } as Response;
  });
}

function throwingFetch(err: Error) {
  return vi.fn(async () => { throw err; });
}

describe("fetchStatic", () => {
  it("returns html and status 200 on success", async () => {
    const fetch = mockFetch([{ status: 200, body: "<html><body>Hello</body></html>" }]);
    const result = await fetchStatic("https://example.com", fetch as unknown as typeof globalThis.fetch);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.html).toContain("Hello");
    expect(result.status).toBe(200);
    expect(result.redirectChain).toEqual([]);
  });

  it("records redirect chain", async () => {
    const fetch = mockFetch([
      { status: 301, headers: { location: "https://example.com/new" } },
      { status: 200, body: "<html>Redirected</html>" },
    ]);
    const result = await fetchStatic("https://example.com", fetch as unknown as typeof globalThis.fetch);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.redirectChain).toEqual(["https://example.com"]);
    expect(result.html).toContain("Redirected");
  });

  it("follows up to 3 redirects", async () => {
    const fetch = mockFetch([
      { status: 302, headers: { location: "https://example.com/a" } },
      { status: 302, headers: { location: "https://example.com/b" } },
      { status: 302, headers: { location: "https://example.com/c" } },
      { status: 200, body: "<html>Final</html>" },
    ]);
    const result = await fetchStatic("https://example.com", fetch as unknown as typeof globalThis.fetch);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.redirectChain).toHaveLength(3);
  });

  it("stops following redirects after 3 hops", async () => {
    // 4 redirects — should stop and return the 4th response as-is
    const fetch = mockFetch([
      { status: 301, headers: { location: "https://example.com/1" } },
      { status: 301, headers: { location: "https://example.com/2" } },
      { status: 301, headers: { location: "https://example.com/3" } },
      { status: 301, headers: { location: "https://example.com/4" } },
    ]);
    const result = await fetchStatic("https://example.com", fetch as unknown as typeof globalThis.fetch);
    // 4th response is a 3xx — not ok, treated as http-error
    expect(result.ok).toBe(false);
  });

  it("returns http-error for 404", async () => {
    const fetch = mockFetch([{ status: 404 }]);
    const result = await fetchStatic("https://example.com/missing", fetch as unknown as typeof globalThis.fetch);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.kind).toBe("http-error");
    expect(result.status).toBe(404);
  });

  it("returns http-error for 500", async () => {
    const fetch = mockFetch([{ status: 500 }]);
    const result = await fetchStatic("https://example.com", fetch as unknown as typeof globalThis.fetch);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.kind).toBe("http-error");
    expect(result.status).toBe(500);
  });

  it("returns timeout error on AbortError", async () => {
    const err = new DOMException("The operation was aborted.", "AbortError");
    const result = await fetchStatic("https://example.com", throwingFetch(err as Error) as unknown as typeof globalThis.fetch);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.kind).toBe("timeout");
    expect(result.status).toBeNull();
  });

  it("returns dns error on ENOTFOUND", async () => {
    const err = Object.assign(new Error("getaddrinfo ENOTFOUND notareal.domain"), { code: "ENOTFOUND" });
    const result = await fetchStatic("https://notareal.domain", throwingFetch(err) as unknown as typeof globalThis.fetch);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.kind).toBe("dns");
  });

  it("returns tls error on certificate message", async () => {
    const err = new Error("unable to verify the first certificate (SSL/TLS error)");
    const result = await fetchStatic("https://bad-tls.example.com", throwingFetch(err) as unknown as typeof globalThis.fetch);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.kind).toBe("tls");
  });

  it("returns network error for generic failures", async () => {
    const err = new Error("fetch failed");
    const result = await fetchStatic("https://example.com", throwingFetch(err) as unknown as typeof globalThis.fetch);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.kind).toBe("network");
  });

  it("collects response headers on success", async () => {
    const fetch = mockFetch([{
      status: 200,
      headers: { "content-type": "text/html", "x-robots-tag": "noindex" },
      body: "<html></html>",
    }]);
    const result = await fetchStatic("https://example.com", fetch as unknown as typeof globalThis.fetch);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.headers["content-type"]).toBe("text/html");
    expect(result.headers["x-robots-tag"]).toBe("noindex");
  });

  it("always sets fetchedAt as a Date", async () => {
    const before = new Date();
    const fetch = mockFetch([{ status: 200, body: "" }]);
    const result = await fetchStatic("https://example.com", fetch as unknown as typeof globalThis.fetch);
    const after = new Date();
    expect(result.fetchedAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
    expect(result.fetchedAt.getTime()).toBeLessThanOrEqual(after.getTime());
  });

  it("handles redirect with no location header gracefully", async () => {
    const fetch = mockFetch([{ status: 302, headers: {} }, { status: 200, body: "<html></html>" }]);
    const result = await fetchStatic("https://example.com", fetch as unknown as typeof globalThis.fetch);
    // No location → stays at same URL, loop exits, returns whatever the first response was
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.kind).toBe("http-error");
    expect(result.status).toBe(302);
  });

  it("sets redirectChain empty on direct success", async () => {
    const fetch = mockFetch([{ status: 200, body: "<html></html>" }]);
    const result = await fetchStatic("https://example.com", fetch as unknown as typeof globalThis.fetch);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.redirectChain).toHaveLength(0);
  });
});
