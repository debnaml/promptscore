import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

const STATUSES = ["new", "contacted", "qualified", "converted", "not_a_fit"];

function csvEscape(v: unknown): string {
  if (v == null) return "";
  const s = String(v);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export async function GET(request: NextRequest) {
  // Middleware already enforces admin gate for /api/admin/*
  const url = new URL(request.url);
  const q = (url.searchParams.get("q") ?? "").trim();
  const status = url.searchParams.get("status") ?? "";
  const scoreMin = url.searchParams.get("score_min");
  const scoreMax = url.searchParams.get("score_max");

  let query = supabaseAdmin
    .from("leads")
    .select("created_at, email, name, role, company, website, status, consent_marketing, unsubscribed, scan_id, scans(overall_score)")
    .order("created_at", { ascending: false })
    .limit(5000);

  if (q) {
    query = query.or(
      `email.ilike.%${q}%,name.ilike.%${q}%,company.ilike.%${q}%,website.ilike.%${q}%`
    );
  }
  if (status && STATUSES.includes(status)) {
    query = query.eq("status", status);
  }

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  type Row = {
    created_at: string;
    email: string;
    name: string | null;
    role: string | null;
    company: string | null;
    website: string | null;
    status: string;
    consent_marketing: boolean;
    unsubscribed: boolean | null;
    scan_id: string | null;
    scans: { overall_score: number | null } | null;
  };
  let rows = (data ?? []) as unknown as Row[];

  const min = scoreMin ? Number(scoreMin) : null;
  const max = scoreMax ? Number(scoreMax) : null;
  if (min != null || max != null) {
    rows = rows.filter((r) => {
      const s = r.scans?.overall_score ?? null;
      if (s == null) return false;
      if (min != null && s < min) return false;
      if (max != null && s > max) return false;
      return true;
    });
  }

  const headers = [
    "captured_at",
    "email",
    "name",
    "role",
    "company",
    "website",
    "status",
    "marketing_opt_in",
    "unsubscribed",
    "score",
    "scan_id",
  ];

  const lines = [headers.join(",")];
  for (const r of rows) {
    lines.push([
      csvEscape(r.created_at),
      csvEscape(r.email),
      csvEscape(r.name),
      csvEscape(r.role),
      csvEscape(r.company),
      csvEscape(r.website),
      csvEscape(r.status),
      csvEscape(r.consent_marketing ? "yes" : "no"),
      csvEscape(r.unsubscribed ? "yes" : "no"),
      csvEscape(r.scans?.overall_score ?? ""),
      csvEscape(r.scan_id),
    ].join(","));
  }

  const csv = lines.join("\n");
  const filename = `leads-${new Date().toISOString().slice(0, 10)}.csv`;

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
