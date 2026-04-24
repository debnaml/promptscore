import { describe, it, expect, vi, beforeEach } from "vitest";

// ---- Rate-limit mock (always allow) ----
vi.mock("@/lib/rate-limit", () => ({
  scanReadLimiter: null,
  getClientIP: () => "127.0.0.1",
  checkRateLimit: async () => null,
}));

// ---- Supabase mock ----
const mockSingle = vi.fn();
const mockEq = vi.fn(() => ({ single: mockSingle }));
const mockSelect = vi.fn(() => ({ eq: mockEq }));
const mockFrom = vi.fn((_table: string) => ({ select: mockSelect }));

vi.mock("@/lib/supabase", () => ({
  supabaseAdmin: { from: (table: string) => mockFrom(table) },
}));

// ---- Import handler after mocks ----
import { GET } from "@/app/api/scan/[id]/route";
import { NextRequest } from "next/server";

function req(id: string) {
  return new NextRequest(`http://localhost:3000/api/scan/${id}`);
}

describe("GET /api/scan/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 400 for invalid UUID", async () => {
    const res = await GET(req("not-a-uuid"), { params: { id: "not-a-uuid" } });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Invalid scan ID");
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it("returns scan data for valid UUID", async () => {
    const scan = {
      id: "11111111-1111-1111-1111-111111111111",
      url: "https://example.com",
      url_hash: "abc123",
      status: "queued",
      created_at: "2026-04-20T00:00:00Z",
    };
    mockSingle.mockResolvedValue({ data: scan, error: null });

    const res = await GET(req(scan.id), { params: { id: scan.id } });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.id).toBe(scan.id);
    expect(body.url).toBe("https://example.com");
    expect(mockFrom).toHaveBeenCalledWith("scans");
  });

  it("returns 404 for non-existent UUID", async () => {
    mockSingle.mockResolvedValue({
      data: null,
      error: { code: "PGRST116", message: "not found" },
    });

    const id = "22222222-2222-2222-2222-222222222222";
    const res = await GET(req(id), { params: { id } });
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toBe("Scan not found");
  });

  it("returns 500 on unexpected DB error", async () => {
    mockSingle.mockResolvedValue({
      data: null,
      error: { code: "XXXXX", message: "db broke" },
    });

    const id = "33333333-3333-3333-3333-333333333333";
    const res = await GET(req(id), { params: { id } });
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe("Failed to fetch scan");
  });
});
