import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next") ?? "/admin";

  if (code) {
    try {
      const supabase = await createClient();
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (error) {
        console.error("[auth/callback] exchangeCodeForSession error:", error.message, error);
        return NextResponse.redirect(new URL(`/admin/login?error=${encodeURIComponent(error.message)}`, url.origin));
      }
      return NextResponse.redirect(new URL(next, url.origin));
    } catch (e) {
      console.error("[auth/callback] unexpected exception:", e);
      return NextResponse.redirect(new URL(`/admin/login?error=${encodeURIComponent(String(e))}`, url.origin));
    }
  }

  return NextResponse.redirect(new URL("/admin/login?error=no_code", url.origin));
}
