/**
 * Check if a hostname is a private/internal IP address.
 * Covers IPv4 private ranges and IPv6 loopback.
 */
export function isPrivateIP(hostname: string): boolean {
  // Remove IPv6 brackets if present
  const clean = hostname.replace(/^\[|\]$/g, "");

  // IPv4 private ranges
  const ipv4PrivatePatterns = [
    /^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/, // 10.0.0.0/8
    /^172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3}$/, // 172.16.0.0/12
    /^192\.168\.\d{1,3}\.\d{1,3}$/, // 192.168.0.0/16
    /^127\.\d{1,3}\.\d{1,3}\.\d{1,3}$/, // 127.0.0.0/8 (loopback)
    /^169\.254\.\d{1,3}\.\d{1,3}$/, // 169.254.0.0/16 (link-local)
    /^0\.0\.0\.0$/, // 0.0.0.0
  ];

  for (const pattern of ipv4PrivatePatterns) {
    if (pattern.test(clean)) {
      return true;
    }
  }

  // IPv6 loopback and private
  if (clean === "::1" || clean === "::") {
    return true;
  }

  // IPv6 link-local (fe80::)
  if (clean.toLowerCase().startsWith("fe80:")) {
    return true;
  }

  // IPv6 unique local (fc00::/7)
  if (/^f[cd]/i.test(clean)) {
    return true;
  }

  return false;
}
