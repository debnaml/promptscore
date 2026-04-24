import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// Mock the rate-limit module to always allow (no Upstash in tests)
vi.mock("@/lib/rate-limit", () => ({
  scanCreateLimiter: null,
  scanReadLimiter: null,
  getClientIP: () => "127.0.0.1",
  checkRateLimit: async () => null,
}));

describe("rate-limit utilities", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("getClientIP extracts IP from x-forwarded-for", async () => {
    // Import the real implementation for unit test
    vi.doUnmock("@/lib/rate-limit");
    const { getClientIP } = await import("@/lib/rate-limit");

    const request = new NextRequest("http://localhost:3000/api/scan", {
      headers: { "x-forwarded-for": "1.2.3.4, 5.6.7.8" },
    });
    expect(getClientIP(request)).toBe("1.2.3.4");
  });

  it("getClientIP extracts IP from x-real-ip", async () => {
    vi.doUnmock("@/lib/rate-limit");
    const { getClientIP } = await import("@/lib/rate-limit");

    const request = new NextRequest("http://localhost:3000/api/scan", {
      headers: { "x-real-ip": "9.8.7.6" },
    });
    expect(getClientIP(request)).toBe("9.8.7.6");
  });

  it("getClientIP falls back to 127.0.0.1", async () => {
    vi.doUnmock("@/lib/rate-limit");
    const { getClientIP } = await import("@/lib/rate-limit");

    const request = new NextRequest("http://localhost:3000/api/scan");
    expect(getClientIP(request)).toBe("127.0.0.1");
  });

  it("checkRateLimit returns null when limiter is null", async () => {
    vi.doUnmock("@/lib/rate-limit");
    const { checkRateLimit } = await import("@/lib/rate-limit");

    const result = await checkRateLimit(null, "test-ip");
    expect(result).toBeNull();
  });

  it("checkRateLimit returns 429 when rate limited", async () => {
    vi.doUnmock("@/lib/rate-limit");
    const { checkRateLimit } = await import("@/lib/rate-limit");

    const fakeLimiter = {
      limit: vi.fn().mockResolvedValue({
        success: false,
        limit: 10,
        remaining: 0,
        reset: Date.now() + 60000,
      }),
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await checkRateLimit(fakeLimiter as any, "1.2.3.4");
    expect(result).not.toBeNull();
    expect(result!.status).toBe(429);
    const body = await result!.json();
    expect(body.error).toBe("Too many requests");
  });

  it("checkRateLimit returns null when allowed", async () => {
    vi.doUnmock("@/lib/rate-limit");
    const { checkRateLimit } = await import("@/lib/rate-limit");

    const fakeLimiter = {
      limit: vi.fn().mockResolvedValue({
        success: true,
        limit: 10,
        remaining: 9,
        reset: Date.now() + 60000,
      }),
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await checkRateLimit(fakeLimiter as any, "1.2.3.4");
    expect(result).toBeNull();
  });
});
