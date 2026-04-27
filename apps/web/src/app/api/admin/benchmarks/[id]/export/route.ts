import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

const CATEGORY_KEYS = [
  "crawler_access",
  "structured_data",
  "content_clarity",
  "ai_specific",
  "authority_trust",
];

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { data: batch } = await supabaseAdmin
    .from("bench_batches")
    .select("name")
    .eq("id", params.id)
    .single();

  if (!batch) {
    return NextResponse.json({ error: "Batch not found" }, { status: 404 });
  }

  const { data: results } = await supabaseAdmin
    .from("bench_results")
    .select("url, label, position, status, error, scans(overall_score, category_scores)")
    .eq("batch_id", params.id)
    .order("position");

  const rows = [...(results ?? [])].sort((a, b) => {
    const sa = (a.scans as { overall_score?: number } | null)?.overall_score ?? -1;
    const sb = (b.scans as { overall_score?: number } | null)?.overall_score ?? -1;
    return sb - sa;
  });

  const header = [
    "rank",
    "url",
    "label",
    "status",
    "overall_score",
    ...CATEGORY_KEYS,
    "error",
  ];

  const csvRows = rows.map((r, i) => {
    const scan = r.scans as {
      overall_score?: number;
      category_scores?: Record<string, number>;
    } | null;
    const isComplete = r.status === "complete";
    return [
      isComplete ? i + 1 : "",
      r.url,
      r.label ?? "",
      r.status,
      scan?.overall_score ?? "",
      ...CATEGORY_KEYS.map((k) => scan?.category_scores?.[k] ?? ""),
      r.error ?? "",
    ]
      .map((v) => `"${String(v).replace(/"/g, '""')}"`)
      .join(",");
  });

  const csv = [header.join(","), ...csvRows].join("\n");
  const filename = `${batch.name.replace(/[^a-z0-9]/gi, "-").toLowerCase()}.csv`;

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
