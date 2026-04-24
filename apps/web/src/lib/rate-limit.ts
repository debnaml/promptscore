import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { NextRequest, NextResponse } from "next/server";

const upstashUrl = process.env.UPSTASH_REDIS_URL?.trim();
const upstashToken = process.env.UPSTASH_REDIS_TOKEN?.trim();

/**
 * If UPSTASH_REDIS_URL is not set, rate limiting is disabled (dev mode).
 */
const redis =
  upstashUrl && upstashToken
    ? new Redis({
        url: upstashUrl,
        token: upstashToken,
      })
    : null;

/**
 * POST /api/scan — 10 scan creations per IP per hour
 */
export const scanCreateLimiter = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(10, "1 h"),
      prefix: "rl:scan:create",
    })
  : null;

/**
 * GET /api/scan/[id] — 60 reads per IP per minute
 */
export const scanReadLimiter = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(60, "1 m"),
      prefix: "rl:scan:read",
    })
  : null;

/**
 * Extract client IP from request headers (works on Vercel).
 */
export function getClientIP(request: NextRequest): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "127.0.0.1"
  );
}

/**
 * Check rate limit. Returns a 429 response if exceeded, or null if allowed.
 */
export async function checkRateLimit(
  limiter: Ratelimit | null,
  identifier: string
): Promise<NextResponse | null> {
  if (!limiter) return null; // Rate limiting disabled

  const { success, limit, reset } = await limiter.limit(identifier);

  if (!success) {
    return NextResponse.json(
      { error: "Too many requests" },
      {
        status: 429,
        headers: {
          "X-RateLimit-Limit": limit.toString(),
          "X-RateLimit-Remaining": "0",
          "X-RateLimit-Reset": reset.toString(),
          "Retry-After": Math.ceil((reset - Date.now()) / 1000).toString(),
        },
      }
    );
  }

  return null;
}
