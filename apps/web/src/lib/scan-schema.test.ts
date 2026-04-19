import { describe, it, expect } from "vitest";
import { scanRequestSchema } from "./scan-schema";

describe("scanRequestSchema", () => {
  it("accepts a valid https URL", () => {
    const result = scanRequestSchema.safeParse({ url: "https://performancepeak.co.uk" });
    expect(result.success).toBe(true);
  });

  it("accepts a valid http URL", () => {
    const result = scanRequestSchema.safeParse({ url: "http://example.com" });
    expect(result.success).toBe(true);
  });

  it("rejects a non-URL string", () => {
    const result = scanRequestSchema.safeParse({ url: "not-a-url" });
    expect(result.success).toBe(false);
  });

  it("rejects an empty string", () => {
    const result = scanRequestSchema.safeParse({ url: "" });
    expect(result.success).toBe(false);
  });

  it("rejects missing url field", () => {
    const result = scanRequestSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it("rejects localhost", () => {
    const result = scanRequestSchema.safeParse({ url: "http://localhost:3000" });
    expect(result.success).toBe(false);
  });

  it("rejects 127.0.0.1", () => {
    const result = scanRequestSchema.safeParse({ url: "http://127.0.0.1" });
    expect(result.success).toBe(false);
  });

  it("rejects private IP 10.0.0.1", () => {
    const result = scanRequestSchema.safeParse({ url: "http://10.0.0.1" });
    expect(result.success).toBe(false);
  });

  it("rejects private IP 192.168.1.1", () => {
    const result = scanRequestSchema.safeParse({ url: "http://192.168.1.1" });
    expect(result.success).toBe(false);
  });

  it("rejects private IP 172.16.0.1", () => {
    const result = scanRequestSchema.safeParse({ url: "http://172.16.0.1" });
    expect(result.success).toBe(false);
  });

  it("rejects ftp protocol", () => {
    const result = scanRequestSchema.safeParse({ url: "ftp://example.com" });
    expect(result.success).toBe(false);
  });
});
