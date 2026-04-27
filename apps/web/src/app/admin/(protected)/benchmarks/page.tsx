import { supabaseAdmin } from "@/lib/supabase";
import Link from "next/link";
import { createBatchAction } from "./actions";

export const dynamic = "force-dynamic";

const STATUS_BADGE: Record<string, string> = {
  pending:  "bg-slate-100 text-slate-600",
  running:  "bg-blue-100 text-blue-700",
  complete: "bg-green-100 text-green-700",
  failed:   "bg-red-100 text-red-700",
};

export default async function BenchmarksPage() {
  const { data: batches } = await supabaseAdmin
    .from("bench_batches")
    .select("id, name, status, total_urls, completed_urls, failed_urls, created_at, completed_at")
    .order("created_at", { ascending: false });

  return (
    <div className="p-6 max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold text-slate-900">Benchmarks</h1>
        <a
          href="#new"
          className="rounded-md bg-slate-900 text-white text-sm font-medium px-4 py-2 hover:bg-slate-800"
        >
          + New batch
        </a>
      </div>

      {/* Batch list */}
      {(batches ?? []).length === 0 ? (
        <div className="bg-white rounded-md border border-slate-200 p-8 text-center text-slate-500 text-sm mb-8">
          No batches yet. Create one below.
        </div>
      ) : (
        <div className="bg-white rounded-md border border-slate-200 overflow-hidden mb-8">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-400 border-b border-slate-100">
              <tr>
                <th className="px-4 py-2 text-left">Name</th>
                <th className="px-4 py-2 text-left">Status</th>
                <th className="px-4 py-2 text-left">Progress</th>
                <th className="px-4 py-2 text-left">Created</th>
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody>
              {(batches ?? []).map((b) => {
                const pct = b.total_urls > 0
                  ? Math.round(((b.completed_urls + b.failed_urls) / b.total_urls) * 100)
                  : 0;
                return (
                  <tr key={b.id} className="border-t border-slate-100">
                    <td className="px-4 py-3 font-medium">{b.name}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_BADGE[b.status] ?? ""}`}>
                        {b.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-24 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-blue-500 rounded-full"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="text-xs text-slate-500">
                          {b.completed_urls + b.failed_urls}/{b.total_urls}
                        </span>
                        {b.failed_urls > 0 && (
                          <span className="text-xs text-red-500">{b.failed_urls} failed</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500">
                      {new Date(b.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/admin/benchmarks/${b.id}`}
                        className="text-blue-600 hover:underline text-xs"
                      >
                        View →
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Create form */}
      <div id="new" className="bg-white rounded-md border border-slate-200 p-5">
        <h2 className="text-sm font-semibold text-slate-800 mb-4">New benchmark batch</h2>
        <form action={createBatchAction} className="space-y-4">
          <div>
            <label className="block text-sm text-slate-600 mb-1" htmlFor="name">
              Batch name
            </label>
            <input
              id="name"
              name="name"
              required
              placeholder="UK luxury resorts — April 2026"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm text-slate-600 mb-1" htmlFor="urls">
              URLs{" "}
              <span className="text-slate-400 font-normal">
                (one per line — optionally: url, label)
              </span>
            </label>
            <textarea
              id="urls"
              name="urls"
              required
              rows={8}
              placeholder={`ikosresorts.com, Ikos Resorts\nsani-resort.com, Sani Resort\ngleneagles.com`}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-slate-400 mt-0.5">Max 100 URLs. https:// added automatically if missing.</p>
          </div>

          <div className="flex items-center gap-4">
            <div className="w-40">
              <label className="block text-sm text-slate-600 mb-1" htmlFor="delay_seconds">
                Delay between scans (s)
              </label>
              <input
                id="delay_seconds"
                name="delay_seconds"
                type="number"
                min={10}
                max={300}
                defaultValue={30}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <button
            type="submit"
            className="rounded-md bg-slate-900 text-white text-sm font-medium px-4 py-2 hover:bg-slate-800"
          >
            Start batch
          </button>
        </form>
      </div>
    </div>
  );
}
