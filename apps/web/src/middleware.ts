import { NextRequest, NextResponse } from "next/server";

/**
 * HTTP Basic Auth guard for development / pre-launch.
 * Set SITE_PASSWORD in env vars to enable. Leave unset (or empty) to disable.
 * Username is ignored — any value works.
 */
export function middleware(request: NextRequest) {
  const password = process.env.SITE_PASSWORD;

  // No password set → pass through
  if (!password) return NextResponse.next();

  const auth = request.headers.get("authorization");

  if (auth) {
    const [scheme, encoded] = auth.split(" ");
    if (scheme === "Basic" && encoded) {
      const decoded = Buffer.from(encoded, "base64").toString("utf-8");
      const colonIdx = decoded.indexOf(":");
      const providedPassword = colonIdx !== -1 ? decoded.slice(colonIdx + 1) : decoded;
      if (providedPassword === password) return NextResponse.next();
    }
  }

  return new NextResponse("Access restricted", {
    status: 401,
    headers: {
      "WWW-Authenticate": 'Basic realm="PromptScore Dev", charset="UTF-8"',
    },
  });
}

export const config = {
  // Apply to all routes except Next.js internals and static assets
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
