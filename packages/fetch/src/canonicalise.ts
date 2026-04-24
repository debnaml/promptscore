import { createHash } from "node:crypto";

export interface CanonicaliseOptions {
  /** Strip leading `www.` from the host. Defaults to false. */
  stripWww?: boolean;
}

export interface CanonicaliseResult {
  canonical: string;
  urlHash: string;
}

/**
 * Canonicalise a raw URL string into a deterministic form for caching & hashing.
 *
 * Rules:
 * - Prepend `https://` if no protocol is present
 * - Lowercase host
 * - Remove default ports (80 for http, 443 for https)
 * - Strip fragment (`#...`)
 * - Collapse duplicate slashes in the path
 * - Sort query parameters alphabetically (deterministic)
 * - Remove empty query string
 * - Remove trailing slash from host-only URLs, retain for paths
 * - Optionally strip `www.` prefix from host
 */
export function canonicalise(
  raw: string,
  options: CanonicaliseOptions = {}
): CanonicaliseResult {
  if (typeof raw !== "string") {
    throw new TypeError("canonicalise: input must be a string");
  }

  let input = raw.trim();
  if (input === "") {
    throw new Error("canonicalise: input must not be empty");
  }

  // Prepend https:// if no protocol
  if (!/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(input)) {
    input = `https://${input}`;
  }

  let url: URL;
  try {
    url = new URL(input);
  } catch {
    throw new Error(`canonicalise: invalid URL: ${raw}`);
  }

  // Only http(s) is supported
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error(
      `canonicalise: unsupported protocol: ${url.protocol}`
    );
  }

  // Lowercase host (URL class already lowercases, but IDN punycode may keep case)
  let host = url.hostname.toLowerCase();

  // Optionally strip leading www.
  if (options.stripWww && host.startsWith("www.")) {
    host = host.slice(4);
  }

  // Remove default ports
  let port = url.port;
  if (
    (url.protocol === "http:" && port === "80") ||
    (url.protocol === "https:" && port === "443")
  ) {
    port = "";
  }

  // Normalise path: collapse duplicate slashes
  let pathname = url.pathname.replace(/\/{2,}/g, "/");

  // Trailing slash rules:
  //   - Host-only (pathname === "/"): remove trailing slash (render as no path)
  //   - Path present: retain as-is (a trailing `/` is semantically meaningful)
  const isHostOnly = pathname === "/" || pathname === "";
  if (isHostOnly) {
    pathname = "";
  }

  // Sort query params for determinism, drop empty
  const params = Array.from(url.searchParams.entries()).sort(([a], [b]) =>
    a < b ? -1 : a > b ? 1 : 0
  );
  const search =
    params.length > 0
      ? "?" +
        params
          .map(
            ([k, v]) =>
              `${encodeURIComponent(k)}=${encodeURIComponent(v)}`
          )
          .join("&")
      : "";

  // Fragment is always dropped

  const hostPart = port ? `${host}:${port}` : host;
  const canonical = `${url.protocol}//${hostPart}${pathname}${search}`;

  const urlHash = createHash("sha256").update(canonical).digest("hex");

  return { canonical, urlHash };
}
