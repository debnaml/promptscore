import { describe, it, expect } from "vitest";
import { canonicalise } from "./canonicalise";

describe("canonicalise", () => {
  describe("protocol handling", () => {
    it("prepends https:// when no protocol is given", () => {
      expect(canonicalise("example.com").canonical).toBe("https://example.com");
    });

    it("keeps http:// when explicitly given", () => {
      expect(canonicalise("http://example.com").canonical).toBe(
        "http://example.com"
      );
    });

    it("keeps https:// when explicitly given", () => {
      expect(canonicalise("https://example.com").canonical).toBe(
        "https://example.com"
      );
    });

    it("rejects unsupported protocols", () => {
      expect(() => canonicalise("ftp://example.com")).toThrow(
        /unsupported protocol/
      );
    });
  });

  describe("host normalisation", () => {
    it("lowercases a mixed-case host", () => {
      expect(canonicalise("HTTPS://Example.COM").canonical).toBe(
        "https://example.com"
      );
    });

    it("strips www. when stripWww option is true", () => {
      expect(
        canonicalise("https://www.example.com", { stripWww: true }).canonical
      ).toBe("https://example.com");
    });

    it("keeps www. by default", () => {
      expect(canonicalise("https://www.example.com").canonical).toBe(
        "https://www.example.com"
      );
    });

    it("handles internationalised domain names (IDN → punycode)", () => {
      const result = canonicalise("https://bücher.de").canonical;
      expect(result).toBe("https://xn--bcher-kva.de");
    });

    it("handles emoji hostnames", () => {
      const result = canonicalise("https://i❤️.ws").canonical;
      expect(result.startsWith("https://xn--")).toBe(true);
    });
  });

  describe("port handling", () => {
    it("removes default http port 80", () => {
      expect(canonicalise("http://example.com:80/foo").canonical).toBe(
        "http://example.com/foo"
      );
    });

    it("removes default https port 443", () => {
      expect(canonicalise("https://example.com:443/foo").canonical).toBe(
        "https://example.com/foo"
      );
    });

    it("keeps non-default ports", () => {
      expect(canonicalise("https://example.com:8080/foo").canonical).toBe(
        "https://example.com:8080/foo"
      );
    });
  });

  describe("fragment handling", () => {
    it("strips #fragment", () => {
      expect(canonicalise("https://example.com/page#section").canonical).toBe(
        "https://example.com/page"
      );
    });

    it("strips fragment with no path", () => {
      expect(canonicalise("https://example.com#top").canonical).toBe(
        "https://example.com"
      );
    });
  });

  describe("trailing slash handling", () => {
    it("removes trailing slash for host-only URLs", () => {
      expect(canonicalise("https://example.com/").canonical).toBe(
        "https://example.com"
      );
    });

    it("retains trailing slash on paths", () => {
      expect(canonicalise("https://example.com/blog/").canonical).toBe(
        "https://example.com/blog/"
      );
    });

    it("handles empty path identically to root slash", () => {
      expect(canonicalise("https://example.com").canonical).toBe(
        canonicalise("https://example.com/").canonical
      );
    });
  });

  describe("path normalisation", () => {
    it("collapses duplicate slashes", () => {
      expect(canonicalise("https://example.com//foo///bar").canonical).toBe(
        "https://example.com/foo/bar"
      );
    });

    it("preserves single slashes", () => {
      expect(canonicalise("https://example.com/a/b/c").canonical).toBe(
        "https://example.com/a/b/c"
      );
    });
  });

  describe("query string determinism", () => {
    it("sorts query params alphabetically", () => {
      expect(canonicalise("https://example.com/?b=2&a=1").canonical).toBe(
        "https://example.com?a=1&b=2"
      );
    });

    it("produces the same canonical for different query orderings", () => {
      const a = canonicalise("https://example.com/?foo=1&bar=2").canonical;
      const b = canonicalise("https://example.com/?bar=2&foo=1").canonical;
      expect(a).toBe(b);
    });

    it("drops empty query string", () => {
      expect(canonicalise("https://example.com/?").canonical).toBe(
        "https://example.com"
      );
    });

    it("URL-encodes special characters in params", () => {
      expect(canonicalise("https://example.com/?q=a b&x=y/z").canonical).toBe(
        "https://example.com?q=a%20b&x=y%2Fz"
      );
    });
  });

  describe("input validation", () => {
    it("throws on empty string", () => {
      expect(() => canonicalise("")).toThrow(/must not be empty/);
    });

    it("throws on whitespace-only string", () => {
      expect(() => canonicalise("   ")).toThrow(/must not be empty/);
    });

    it("throws on non-string input", () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect(() => canonicalise(null as any)).toThrow(/must be a string/);
    });

    it("throws on malformed URL", () => {
      expect(() => canonicalise("http://")).toThrow(/invalid URL/);
    });
  });

  describe("hashing", () => {
    it("returns a 64-char sha256 hex hash", () => {
      const { urlHash } = canonicalise("https://example.com");
      expect(urlHash).toMatch(/^[0-9a-f]{64}$/);
    });

    it("produces identical hashes for equivalent URLs", () => {
      const a = canonicalise("HTTPS://Example.com:443/#frag").urlHash;
      const b = canonicalise("https://example.com").urlHash;
      expect(a).toBe(b);
    });

    it("produces different hashes for different URLs", () => {
      const a = canonicalise("https://example.com/a").urlHash;
      const b = canonicalise("https://example.com/b").urlHash;
      expect(a).not.toBe(b);
    });
  });

  describe("trimming", () => {
    it("trims leading and trailing whitespace", () => {
      expect(canonicalise("  https://example.com  ").canonical).toBe(
        "https://example.com"
      );
    });
  });
});
