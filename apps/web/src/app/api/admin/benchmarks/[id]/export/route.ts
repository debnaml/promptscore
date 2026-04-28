import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { ALL_CHECKS } from "@promptscore/scoring";

const CATEGORY_KEYS = [
  "crawler_access",
  "structured_data",
  "content_clarity",
  "ai_specific",
  "authority_trust",
];

const CHECK_KEYS = ALL_CHECKS.map((c) => c.key);

function csvEscape(v: unknown): string {
  const s = v == null ? "" : String(v);
  return `"${s.replace(/"/g, '""')}"`;
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const includeEvidence = request.nextUrl.searchParams.get("evidence") === "1";

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
    .select("url, label, position, status, error, scan_id, scans(overall_score, category_scores, detected_category)")
    .eq("batch_id", params.id)
    .order("position");

  const scanIds = (results ?? [])
    .map((r) => r.scan_id)
    .filter((x): x is string => !!x);

  const checksByScanId = new Map<
    string,
    Map<string, { score: number | null; evidence: unknown; notes: string | null }>
  >();
  if (scanIds.length > 0) {
    const { data: checkRows } = await supabaseAdmin
      .from("scan_checks")
      .select("scan_id, check_key, score, evidence, notes")
      .in("scan_id", scanIds);
    for (const row of checkRows ?? []) {
      const r = row as {
        scan_id: string;
        check_key: string;
        score: number | null;
        evidence: unknown;
        notes: string | null;
      };
      const map = checksByScanId.get(r.scan_id) ?? new Map();
      map.set(r.check_key, { score: r.score, evidence: r.evidence, notes: r.notes });
      checksByScanId.set(r.scan_id, map);
    }
  }

  const sorted = [...(results ?? [])].sort((a, b) => {
    if (a.status === "complete" && b.status !== "complete") return -1;
    if (a.status !== "complete" && b.status === "complete") return 1;
    const sa = (a.scans as { overall_score?: number } | null)?.overall_score ?? -1;
    const sb = (b.scans as { overall_score?: number } | null)?.overall_score ?? -1;
    return sb - sa;
  });

  const header: string[] = [
    "rank",
    "url",
    "label",
    "category",
    "status",
    "overall_score",
    ...CATEGORY_KEYS,
  ];
  for (const key of CHECK_KEYS) {
    header.push(`${key}_score`);
    if (includeEvidence) {
      header.push(`${key}_notes`);
      header.push(`${key}_evidence`);
    }
  }
  header.push("error");

  let rank = 0;
  const csvRows = sorted.map((r) => {
    const scan = r.scans as {
      overall_score?: number;
      category_scores?: Record<string, number>;
      detected_category?: string;
    } | null;
    const isComplete = r.status === "complete";
    if (isComplete) rank++;

    const checks = r.scan_id ? checksByScanId.get(r.scan_id) : undefined;

    const row: unknown[] = [
      isComplete ? rank : "",
      r.url,
      r.label ?? "",
      scan?.detected_category ?? "",
      r.status,
      scan?.overall_score ?? "",
      ...CATEGORY_KEYS.map((k) => scan?.category_scores?.[k] ?? ""),
    ];
    for (const key of CHECK_KEYS) {
      const c = checks?.get(key);
      row.push(c?.score == null ? "" : c.score);
      if (includeEvidence) {
        row.push(c?.notes ?? "");
        row.push(c?.evidence == null ? "" : JSON.stringify(c.evidence));
      }
    }
    row.push(r.error ?? "");
    return row.map(csvEscape).join(",");
  });

  const csv = [header.join(","), ...csvRows].join("\n");
  const safeName = batch.name.replace(/[^a-z0-9]/gi, "-").toLowerCase();
  const suffix = includeEvidence ? "-with-evidence" : "";
  const filename = `${safeName}${suffix}.csv`;

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
