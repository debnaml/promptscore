import { NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS ?? "lee@pp-worldwide.com")
  .split(",")
  .map((s) => s.trim().toLowerCase())
  .filter(Boolean);

function checkBasicAuth(request: NextRequest): NextResponse | null {
  const password = process.env.SITE_PASSWORD;
  if (!password) return null;

  const auth = request.headers.get("authorization");
  if (auth) {
    const [scheme, encoded] = auth.split(" ");
    if (scheme === "Basic" && encoded) {
      const decoded = Buffer.from(encoded, "base64").toString("utf-8");
      const colonIdx = decoded.indexOf(":");
      const providedPassword = colonIdx !== -1 ? decoded.slice(colonIdx + 1) : decoded;
      if (providedPassword === password) return null;
    }
  }

  return new NextResponse("Access restricted", {
    status: 401,
    headers: {
      "WWW-Authenticate": 'Basic realm="PromptScore Dev", charset="UTF-8"',
    },
  });
}

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;

  // QStash worker authenticates via signature — bypass all auth gates
  if (path === "/api/admin/benchmarks/worker") {
    return NextResponse.next();
  }

  // 1. Site-wide HTTP Basic Auth gate (development pre-launch)
  const basicAuthFail = checkBasicAuth(request);
  if (basicAuthFail) return basicAuthFail;

  // 2. Refresh Supabase session cookie on every request
  const { response, user } = await updateSession(request);

  const isAdminRoute =
    (path.startsWith("/admin") && path !== "/admin/login") ||
    path.startsWith("/api/admin");

  if (isAdminRoute) {
    const email = user?.email?.toLowerCase();
    if (!email || !ADMIN_EMAILS.includes(email)) {
      const url = request.nextUrl.clone();
      url.pathname = "/admin/login";
      url.searchParams.set("next", path);
      return NextResponse.redirect(url);
    }
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
