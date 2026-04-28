import { supabaseAdmin } from "@/lib/supabase";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DeleteBatchButton } from "../delete-batch-button";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const revalidate = 0;

const CATEGORIES = [
  { key: "crawler_access",  label: "Crawler" },
  { key: "structured_data", label: "Structured data" },
  { key: "content_clarity", label: "Content" },
  { key: "ai_specific",     label: "AI" },
  { key: "authority_trust", label: "Authority" },
];

function scoreColor(score: number | null | undefined): string {
  if (score == null) return "bg-slate-100 text-slate-400";
  if (score >= 70) return "bg-green-100 text-green-800";
  if (score >= 40) return "bg-yellow-100 text-yellow-800";
  return "bg-red-100 text-red-800";
}

const STATUS_BADGE: Record<string, string> = {
  pending:  "bg-slate-100 text-slate-500",
  running:  "bg-blue-100 text-blue-700",
  complete: "bg-green-100 text-green-700",
  failed:   "bg-red-100 text-red-700",
};

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

  // Sort complete results by overall score desc; pending/failed go to end
  const sorted = [...(results ?? [])].sort((a, b) => {
    const sa = a.scans?.overall_score ?? -1;
    const sb = b.scans?.overall_score ?? -1;
    return sb - sa;
  });

  const complete = sorted.filter((r) => r.status === "complete");
  const notComplete = sorted.filter((r) => r.status !== "complete");
  const ranked = [...complete, ...notComplete];

  const pct = batch.total_urls > 0
    ? Math.round(((batch.completed_urls + batch.failed_urls) / batch.total_urls) * 100)
    : 0;

  return (
    <div className="p-6 max-w-6xl">
      {/* Header */}
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
          <DeleteBatchButton batchId={batch.id} name={batch.name} />
        </div>
      </div>

      {/* Status bar */}
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
          <span className="text-xs text-slate-400" title="Refresh page to see latest progress">
            (refresh page for progress)
          </span>
        )}
        {batch.completed_at && (
          <span className="text-xs">Completed {new Date(batch.completed_at).toLocaleString()}</span>
        )}
      </div>

      {/* Results table */}
      <div className="bg-white rounded-md border border-slate-200 overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-400 border-b border-slate-100">
            <tr>
              <th className="px-3 py-2 text-left w-8">#</th>
              <th className="px-3 py-2 text-left">URL / Label</th>
              <th className="px-3 py-2 text-center">Overall</th>
              {CATEGORIES.map((c) => (
                <th key={c.key} className="px-3 py-2 text-center">{c.label}</th>
              ))}
              <th className="px-3 py-2 text-left">Top gap</th>
              <th className="px-3 py-2 text-left">Status</th>
            </tr>
          </thead>
          <tbody>
            {ranked.map((r, idx) => {
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
              const overall = scan?.overall_score;
              const rawTopGap = scan?.summary?.priority_actions?.[0] ?? scan?.summary?.negatives?.[0] ?? null;
              const topGap = typeof rawTopGap === "string"
                ? rawTopGap
                : (rawTopGap as { title?: string; howToFix?: string } | null)?.title
                  ?? (rawTopGap as { title?: string; howToFix?: string } | null)?.howToFix
                  ?? null;
              const scanUrl = scan?.url ?? r.url;
              let hostname = r.url;
              try { hostname = new URL(r.url).hostname; } catch { /* keep raw */ }
              const displayName = r.label || hostname;

              return (
                <tr key={r.id} className="border-t border-slate-100 align-top">
                  <td className="px-3 py-2 text-slate-400 text-xs tabular-nums">
                    {r.status === "complete" ? idx + 1 : "—"}
                  </td>
                  <td className="px-3 py-2 max-w-[180px]">
                    <div className="font-medium text-slate-900 truncate" title={r.url}>
                      {r.scan_id ? (
                        <Link href={`/admin/scans/${r.scan_id}`} prefetch={false} className="hover:underline text-blue-700">
                          {displayName}
                        </Link>
                      ) : displayName}
                    </div>
                    <div className="text-xs text-slate-400 truncate" title={r.url}>
                      <a href={scanUrl} target="_blank" rel="noopener noreferrer" className="hover:underline">
                        {hostname}
                      </a>
                    </div>
                  </td>
                  <td className="px-3 py-2 text-center">
                    {overall != null ? (
                      <span className={`inline-block rounded px-2 py-0.5 text-xs font-bold tabular-nums ${scoreColor(overall)}`}>
                        {overall}
                      </span>
                    ) : (
                      <span className="text-slate-300 text-xs">—</span>
                    )}
                  </td>
                  {CATEGORIES.map((c) => {
                    const s = scan?.category_scores?.[c.key];
                    return (
                      <td key={c.key} className="px-3 py-2 text-center">
                        {s != null ? (
                          <span className={`inline-block rounded px-1.5 py-0.5 text-xs tabular-nums ${scoreColor(s)}`}>
                            {s}
                          </span>
                        ) : (
                          <span className="text-slate-300 text-xs">—</span>
                        )}
                      </td>
                    );
                  })}
                  <td className="px-3 py-2 text-xs text-slate-600 max-w-[200px]">
                    {topGap ? (
                      <span title={topGap} className="line-clamp-2">{topGap}</span>
                    ) : (
                      <span className="text-slate-300">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_BADGE[r.status] ?? ""}`}>
                      {r.status}
                    </span>
                    {r.error && (
                      <p className="text-xs text-red-500 mt-0.5" title={r.error}>
                        {r.error.slice(0, 60)}
                      </p>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Stats footer */}
      {complete.length > 1 && (
        <div className="mt-4 grid grid-cols-3 gap-3">
          <StatCard
            label="Average score"
            value={String(Math.round(
              complete.reduce((s, r) => s + (r.scans?.overall_score ?? 0), 0) / complete.length
            ))}
          />
          <StatCard
            label="Highest"
            value={String(Math.max(...complete.map((r) => r.scans?.overall_score ?? 0)))}
            sub={complete.find((r) =>
              r.scans?.overall_score === Math.max(...complete.map((x) => x.scans?.overall_score ?? 0))
            )?.label ?? ""}
          />
          <StatCard
            label="Lowest"
            value={String(Math.min(...complete.map((r) => r.scans?.overall_score ?? 100)))}
            sub={complete.find((r) =>
              r.scans?.overall_score === Math.min(...complete.map((x) => x.scans?.overall_score ?? 100))
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
