import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { scanReadLimiter, getClientIP, checkRateLimit } from "@/lib/rate-limit";

// UUID v4 regex for path param validation
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  // Rate limit: 60 reads per IP per minute
  const ip = getClientIP(_request);
  const rateLimited = await checkRateLimit(scanReadLimiter, ip);
  if (rateLimited) return rateLimited;

  const { id } = params;

  if (!UUID_RE.test(id)) {
    return NextResponse.json({ error: "Invalid scan ID" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("scans")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !data) {
    if (error?.code === "PGRST116") {
      // PostgREST: "JSON object requested, multiple (or no) rows returned"
      return NextResponse.json({ error: "Scan not found" }, { status: 404 });
    }
    console.error("Supabase select error:", JSON.stringify(error));
    return NextResponse.json(
      { error: "Failed to fetch scan" },
      { status: 500 }
    );
  }

  return NextResponse.json(data);
}
