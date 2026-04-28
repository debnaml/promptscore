import { supabaseAdmin } from "@/lib/supabase";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ALL_CHECKS, CHECK_COPY } from "@promptscore/scoring";
import { DeleteBatchButton } from "../delete-batch-button";
import { ResultsTable, type ResultRow, type CheckMeta } from "./results-table";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const revalidate = 0;

const STATUS_BADGE: Record<string, string> = {
  pending:  "bg-slate-100 text-slate-500",
  running:  "bg-blue-100 text-blue-700",
  complete: "bg-green-100 text-green-700",
  failed:   "bg-red-100 text-red-700",
};

const CHECKS_META: CheckMeta[] = ALL_CHECKS.map((c) => ({
  key: c.key,
  category: c.category,
  title: CHECK_COPY[c.key]?.title ?? c.key,
}));

export default async function BenchmarkDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const { data: batch } = await supabaseAdmin
    .from("bench_batches")
    .select("*")
    .eq("id", params.id)
    .single();

  if (!batch) notFound();

  const { data: results } = await supabaseAdmin
    .from("bench_results")
    .select("*, scans(overall_score, category_scores, summary, url, status)")
    .eq("batch_id", params.id)
    .order("position");

  const scanIds = (results ?? [])
    .map((r) => r.scan_id)
    .filter((x): x is string => !!x);

  const checksByScanId = new Map<string, Record<string, number | null>>();
  if (scanIds.length > 0) {
    const { data: checkRows } = await supabaseAdmin
      .from("scan_checks")
      .select("scan_id, check_key, score")
      .in("scan_id", scanIds);
    for (const row of checkRows ?? []) {
      const r = row as { scan_id: string; check_key: string; score: number | null };
      const map = checksByScanId.get(r.scan_id) ?? {};
      // DB stores score as 0–100 (or null for not_scored)
      map[r.check_key] = r.score == null || r.score < 0 ? null : r.score;
      checksByScanId.set(r.scan_id, map);
    }
  }

  const rows: ResultRow[] = (results ?? []).map((r) => {
    const scan = r.scans as {
      overall_score?: number;
      category_scores?: Record<string, number>;
      summary?: {
        priority_actions?: Array<string | { title?: string; howToFix?: string }>;
        negatives?: Array<string | { title?: string }>;
      };
      url?: string;
      status?: string;
    } | null;

    const rawTopGap =
      scan?.summary?.priority_actions?.[0] ?? scan?.summary?.negatives?.[0] ?? null;
    const topGap =
      typeof rawTopGap === "string"
        ? rawTopGap
        : (rawTopGap as { title?: string; howToFix?: string } | null)?.title ??
          (rawTopGap as { title?: string; howToFix?: string } | null)?.howToFix ??
          null;

    let hostname = r.url;
    try { hostname = new URL(r.url).hostname; } catch { /* keep raw */ }

    return {
      id: r.id,
      url: r.url,
      label: r.label,
      position: r.position,
      status: r.status,
      error: r.error,
      scan_id: r.scan_id,
      hostname,
      scanUrl: scan?.url ?? r.url,
      overall: scan?.overall_score ?? null,
      category_scores: scan?.category_scores ?? null,
      check_scores: r.scan_id ? checksByScanId.get(r.scan_id) ?? {} : {},
      topGap,
    };
  });

  const complete = rows.filter((r) => r.status === "complete");
  const pct = batch.total_urls > 0
    ? Math.round(((batch.completed_urls + batch.failed_urls) / batch.total_urls) * 100)
    : 0;

  return (
    <div className="p-6 max-w-[1600px]">
      <div className="flex items-start justify-between mb-2">
        <div>
          <Link href="/admin/benchmarks" prefetch={false} className="text-xs text-slate-400 hover:text-slate-600">
            ← Benchmarks
          </Link>
          <h1 className="text-xl font-semibold text-slate-900 mt-0.5">{batch.name}</h1>
        </div>
        <div className="flex gap-2 mt-1 items-center">
          <a
            href={`/api/admin/benchmarks/${params.id}/export`}
            className="rounded-md border border-slate-300 text-sm px-3 py-1.5 hover:bg-slate-50"
          >
            Export CSV
          </a>
          <a
            href={`/api/admin/benchmarks/${params.id}/export?evidence=1`}
            className="rounded-md border border-slate-300 text-sm px-3 py-1.5 hover:bg-slate-50"
          >
            CSV + evidence
          </a>
          <a
            href={`/api/admin/benchmarks/${params.id}/blog`}
            className="rounded-md bg-slate-900 text-white text-sm px-3 py-1.5 hover:bg-slate-800"
          >
            Export for blog
          </a>
          <DeleteBatchButton batchId={batch.id} name={batch.name} />
        </div>
      </div>

      <div className="flex items-center gap-4 mb-6 text-sm text-slate-500">
        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_BADGE[batch.status] ?? ""}`}>
          {batch.status}
        </span>
        <span>{batch.completed_urls + batch.failed_urls} / {batch.total_urls} scanned</span>
        {batch.failed_urls > 0 && (
          <span className="text-red-500">{batch.failed_urls} failed</span>
        )}
        <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden max-w-xs">
          <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
        </div>
        {(batch.status === "running" || batch.status === "pending") && (
          <span className="text-xs text-slate-400">(refresh page for progress)</span>
        )}
        {batch.completed_at && (
          <span className="text-xs">Completed {new Date(batch.completed_at).toLocaleString()}</span>
        )}
      </div>

      <ResultsTable rows={rows} checks={CHECKS_META} />

      {complete.length > 1 && (
        <div className="mt-4 grid grid-cols-3 gap-3">
          <StatCard
            label="Average score"
            value={String(Math.round(
              complete.reduce((s, r) => s + (r.overall ?? 0), 0) / complete.length
            ))}
          />
          <StatCard
            label="Highest"
            value={String(Math.max(...complete.map((r) => r.overall ?? 0)))}
            sub={complete.find((r) =>
              r.overall === Math.max(...complete.map((x) => x.overall ?? 0))
            )?.label ?? ""}
          />
          <StatCard
            label="Lowest"
            value={String(Math.min(...complete.map((r) => r.overall ?? 100)))}
            sub={complete.find((r) =>
              r.overall === Math.min(...complete.map((x) => x.overall ?? 100))
            )?.label ?? ""}
          />
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="bg-white rounded-md border border-slate-200 p-4">
      <div className="text-xs text-slate-500 mb-1">{label}</div>
      <div className="text-2xl font-bold text-slate-900 tabular-nums">{value}</div>
      {sub && <div className="text-xs text-slate-400 mt-0.5 truncate">{sub}</div>}
    </div>
  );
}
