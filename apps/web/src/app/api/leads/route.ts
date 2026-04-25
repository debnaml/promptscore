import { NextRequest, NextResponse } from "next/server";
import { createHash, randomBytes } from "crypto";
import { z } from "zod/v4";
import { supabaseAdmin } from "@/lib/supabase";
import { waitUntil } from "@vercel/functions";
import { generateAndEmailReport } from "@/lib/report-pipeline";

const leadSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email().max(254),
  company: z.string().min(1).max(100),
  website: z.string().max(253).optional(),
  role: z.enum(["Marketing", "SEO", "Dev", "Founder", "Other"]).optional(),
  consent_marketing: z.boolean(),
  scan_id: z.string().uuid(),
  honeypot: z.string().max(0).optional(), // must be empty
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const result = leadSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: "Validation failed", issues: result.error.issues.map((i) => ({ field: String(i.path[0] ?? ""), message: i.message })) },
        { status: 400 }
      );
    }

    const { honeypot, scan_id, ...data } = result.data;

    // Honeypot: bots fill hidden fields
    if (honeypot && honeypot.length > 0) {
      return NextResponse.json({ unlock_token: "blocked" }, { status: 200 });
    }

    // Verify the scan exists and is done
    const { data: scan, error: scanError } = await supabaseAdmin
      .from("scans")
      .select("id, url, status")
      .eq("id", scan_id)
      .single();

    if (scanError || !scan || scan.status !== "done") {
      return NextResponse.json({ error: "Scan not found or not complete" }, { status: 404 });
    }

    // Hash IP for GDPR compliance — store hash not raw IP
    const forwarded = request.headers.get("x-forwarded-for") ?? "";
    const ip = forwarded.split(",")[0]?.trim() ?? "unknown";
    const ipHash = createHash("sha256").update(ip + (process.env["IP_SALT"] ?? "ps-salt")).digest("hex");

    const unlockToken = randomBytes(32).toString("hex");

    // Upsert lead (allow re-submission with same email+scan)
    const { data: lead, error: leadError } = await supabaseAdmin
      .from("leads")
      .upsert(
        {
          name: data.name,
          email: data.email,
          company: data.company,
          website: data.website ?? scan.url,
          role: data.role ?? null,
          consent_marketing: data.consent_marketing,
          scan_id,
          unlock_token: unlockToken,
          consent_ip_hash: ipHash,
          consent_timestamp: new Date().toISOString(),
        },
        { onConflict: "email, scan_id", ignoreDuplicates: false }
      )
      .select("id, unlock_token")
      .single();

    if (leadError || !lead) {
      console.error("Lead upsert error:", leadError);
      return NextResponse.json({ error: "Failed to save" }, { status: 500 });
    }

    // Trigger async PDF generation + email
    waitUntil(generateAndEmailReport(lead.id, scan_id, data.email, data.name));

    return NextResponse.json({ unlock_token: lead.unlock_token }, { status: 201 });
  } catch (err) {
    if (err instanceof SyntaxError) {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }
    console.error("Leads route error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
