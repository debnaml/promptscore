import Link from "next/link";
import { notFound } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";

const SCORE_COLOUR = (s: number | null) => {
  if (s == null) return "text-slate-400";
  if (s >= 70) return "text-emerald-600";
  if (s >= 40) return "text-amber-600";
  return "text-red-600";
};

const CATEGORY_LABELS: Record<string, string> = {
  content_clarity: "Content Clarity",
  crawler_access: "Crawler Access",
  structured_data: "Structured Data",
  technical_performance: "Technical Performance",
};

type CheckRow = {
  id: string;
  category: string;
  check_key: string;
  score: number | null;
  weight: number | null;
  notes: string | null;
  evidence: Record<string, unknown> | null;
};

export default async function ScanDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [{ data: scan }, { data: checks }, { data: lead }] = await Promise.all([
    supabaseAdmin
      .from("scans")
      .select("id, url, overall_score, category_scores, status, detected_category, positives, negatives, priority_actions, started_at, completed_at, created_at")
      .eq("id", id)
      .maybeSingle(),
    supabaseAdmin
      .from("scan_checks")
      .select("id, category, check_key, score, weight, notes, evidence")
      .eq("scan_id", id)
      .order("category")
      .order("check_key"),
    supabaseAdmin
      .from("leads")
      .select("id, name, email")
      .eq("scan_id", id)
      .maybeSingle(),
  ]);

  if (!scan) notFound();

  const checkRows = (checks ?? []) as CheckRow[];

  // Group by category
  const byCategory: Record<string, CheckRow[]> = {};
  for (const c of checkRows) {
    (byCategory[c.category] ??= []).push(c);
  }

  return (
    <div className="p-6 max-w-5xl">
      <div className="mb-4">
        <Link href="/admin/scans" className="text-sm text-slate-500 hover:text-slate-800">
          ← Scans
        </Link>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-slate-900 break-all">{scan.url}</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            {scan.detected_category?.replace(/_/g, " ") ?? "Unknown category"} ·{" "}
            {scan.completed_at ? `Completed ${new Date(scan.completed_at).toLocaleString()}` : scan.status}
          </p>
        </div>
        <div className={`text-4xl font-bold tabular-nums ml-4 shrink-0 ${SCORE_COLOUR(scan.overall_score)}`}>
          {scan.overall_score ?? "—"}
        </div>
      </div>

      {/* Lead link */}
      {lead && (
        <div className="mb-4 text-sm">
          <span className="text-slate-500">Lead: </span>
          <Link href={`/admin/leads/${lead.id}`} className="text-blue-600 hover:underline">
            {lead.name ?? lead.email}
          </Link>
        </div>
      )}

      {/* Category scores */}
      {scan.category_scores && (
        <div className="grid grid-cols-4 gap-3 mb-6">
          {Object.entries(scan.category_scores as Record<string, number>).map(([cat, score]) => (
            <div key={cat} className="bg-white rounded-md border border-slate-200 p-3 text-center">
              <div className={`text-2xl font-bold ${SCORE_COLOUR(score)}`}>{score}</div>
              <div className="text-xs text-slate-500 mt-0.5">
                {CATEGORY_LABELS[cat] ?? cat.replace(/_/g, " ")}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Priority actions */}
      {Array.isArray(scan.priority_actions) && scan.priority_actions.length > 0 && (
        <div className="mb-6 bg-amber-50 border border-amber-200 rounded-md p-4">
          <h2 className="font-medium text-amber-900 mb-2 text-sm">Priority actions</h2>
          <ul className="space-y-1">
            {(scan.priority_actions as string[]).map((a, i) => (
              <li key={i} className="text-sm text-amber-800">• {a}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Checks by category */}
      <div className="space-y-4">
        {Object.entries(byCategory).map(([cat, catChecks]) => (
          <div key={cat} className="bg-white rounded-md border border-slate-200 overflow-hidden">
            <div className="bg-slate-50 px-4 py-2 border-b border-slate-200 flex items-center justify-between">
              <h2 className="font-medium text-slate-700 text-sm">
                {CATEGORY_LABELS[cat] ?? cat.replace(/_/g, " ")}
              </h2>
              <span className="text-xs text-slate-400">{catChecks.length} checks</span>
            </div>
            <table className="min-w-full text-sm">
              <thead className="text-xs uppercase tracking-wide text-slate-400 bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="px-4 py-2 text-left">Check</th>
                  <th className="px-4 py-2 text-right w-20">Score</th>
                  <th className="px-4 py-2 text-right w-16">Weight</th>
                  <th className="px-4 py-2 text-left">Notes</th>
                </tr>
              </thead>
              <tbody>
                {catChecks.map((c) => (
                  <tr key={c.id} className="border-t border-slate-100">
                    <td className="px-4 py-2 font-mono text-xs text-slate-700">{c.check_key}</td>
                    <td className={`px-4 py-2 text-right font-semibold tabular-nums ${SCORE_COLOUR(c.score)}`}>
                      {c.score ?? "—"}
                    </td>
                    <td className="px-4 py-2 text-right text-xs text-slate-400">
                      {c.weight ?? "—"}
                    </td>
                    <td className="px-4 py-2 text-xs text-slate-600 max-w-md">
                      {c.notes ?? "—"}
                      {c.evidence && typeof c.evidence === "object" && !Array.isArray(c.evidence) && (
                        <details className="mt-1">
                          <summary className="cursor-pointer text-slate-400 hover:text-slate-600">evidence</summary>
                          <pre className="mt-1 text-xs bg-slate-50 rounded p-2 overflow-x-auto whitespace-pre-wrap break-all max-h-32">
                            {JSON.stringify(c.evidence, null, 2)}
                          </pre>
                        </details>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      </div>
    </div>
  );
}
