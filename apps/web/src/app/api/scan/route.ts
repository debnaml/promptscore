import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";
import { scanRequestSchema } from "@/lib/scan-schema";
import { supabaseAdmin } from "@/lib/supabase";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate request body
    const result = scanRequestSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        {
          error: "Validation failed",
          issues: result.error.issues.map((i) => ({
            field: i.path.join("."),
            message: i.message,
          })),
        },
        { status: 400 }
      );
    }

    const { url } = result.data;

    // Canonicalise and hash the URL
    const canonical = new URL(url);
    const urlHash = createHash("sha256").update(canonical.href).digest("hex");

    // Insert scan row with status 'queued'
    const { data, error } = await supabaseAdmin
      .from("scans")
      .insert({
        url: canonical.href,
        url_hash: urlHash,
        status: "queued",
      })
      .select("id, status")
      .single();

    if (error) {
      console.error("Supabase insert error:", error);
      return NextResponse.json(
        { error: "Failed to create scan" },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { scan_id: data.id, status: data.status },
      { status: 202 }
    );
  } catch (err) {
    if (err instanceof SyntaxError) {
      return NextResponse.json(
        { error: "Invalid JSON body" },
        { status: 400 }
      );
    }
    console.error("Unexpected error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
