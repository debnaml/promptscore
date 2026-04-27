import { supabaseAdmin } from "@/lib/supabase";
import Link from "next/link";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 50;

export default async function AuditLogPage({
  searchParams,
}: {
  searchParams: { page?: string; action?: string; admin?: string };
}) {
  const page = Math.max(1, Number(searchParams.page ?? 1));
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  let query = supabaseAdmin
    .from("admin_audit_log")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, to);

  if (searchParams.action) query = query.eq("action", searchParams.action);
  if (searchParams.admin) query = query.ilike("admin_email", `%${searchParams.admin}%`);

  const { data: rows, count } = await query;
  const totalPages = Math.ceil((count ?? 0) / PAGE_SIZE);

  return (
    <div className="p-6 max-w-6xl">
      <h1 className="text-xl font-semibold text-slate-900 mb-6">Audit log</h1>

      <div className="mb-4 text-sm text-slate-500">
        {count ?? 0} entries
      </div>

      <div className="bg-white rounded-md border border-slate-200 overflow-hidden">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-400 border-b border-slate-100">
            <tr>
              <th className="px-4 py-2 text-left w-40">Timestamp</th>
              <th className="px-4 py-2 text-left">Admin</th>
              <th className="px-4 py-2 text-left">Action</th>
              <th className="px-4 py-2 text-left">Target</th>
              <th className="px-4 py-2 text-left">Before</th>
              <th className="px-4 py-2 text-left">After</th>
            </tr>
          </thead>
          <tbody>
            {(rows ?? []).map((row) => (
              <tr key={row.id} className="border-t border-slate-100 align-top">
                <td className="px-4 py-2 text-xs text-slate-500 whitespace-nowrap">
                  {new Date(row.created_at).toLocaleString()}
                </td>
                <td className="px-4 py-2 text-xs">{row.admin_email}</td>
                <td className="px-4 py-2">
                  <span className="rounded px-1.5 py-0.5 bg-slate-100 text-xs font-mono">{row.action}</span>
                </td>
                <td className="px-4 py-2 text-xs">
                  {row.target_type && (
                    <span className="text-slate-500">{row.target_type}</span>
                  )}
                  {row.target_id && row.target_type === "lead" && (
                    <>
                      {" "}
                      <Link
                        href={`/admin/leads/${row.target_id}`}
                        className="text-blue-600 hover:underline font-mono"
                      >
                        {String(row.target_id).slice(0, 8)}…
                      </Link>
                    </>
                  )}
                  {row.target_id && row.target_type !== "lead" && (
                    <span className="font-mono text-slate-400 ml-1">{String(row.target_id).slice(0, 8)}…</span>
                  )}
                </td>
                <td className="px-4 py-2 text-xs max-w-[200px]">
                  {row.before ? (
                    <details>
                      <summary className="cursor-pointer text-slate-500 select-none">view</summary>
                      <pre className="mt-1 text-xs bg-slate-50 rounded p-1 overflow-x-auto whitespace-pre-wrap break-all max-w-xs">
                        {JSON.stringify(row.before, null, 2)}
                      </pre>
                    </details>
                  ) : (
                    <span className="text-slate-300">—</span>
                  )}
                </td>
                <td className="px-4 py-2 text-xs max-w-[200px]">
                  {row.after ? (
                    <details>
                      <summary className="cursor-pointer text-slate-500 select-none">view</summary>
                      <pre className="mt-1 text-xs bg-slate-50 rounded p-1 overflow-x-auto whitespace-pre-wrap break-all max-w-xs">
                        {JSON.stringify(row.after, null, 2)}
                      </pre>
                    </details>
                  ) : (
                    <span className="text-slate-300">—</span>
                  )}
                </td>
              </tr>
            ))}
            {(rows ?? []).length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                  No audit log entries yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex gap-2 mt-4 items-center text-sm">
          {page > 1 && (
            <Link
              href={`?page=${page - 1}${searchParams.action ? `&action=${searchParams.action}` : ""}${searchParams.admin ? `&admin=${searchParams.admin}` : ""}`}
              className="rounded-md border border-slate-300 px-3 py-1 hover:bg-slate-50"
            >
              ← Prev
            </Link>
          )}
          <span className="text-slate-500">Page {page} of {totalPages}</span>
          {page < totalPages && (
            <Link
              href={`?page=${page + 1}${searchParams.action ? `&action=${searchParams.action}` : ""}${searchParams.admin ? `&admin=${searchParams.admin}` : ""}`}
              className="rounded-md border border-slate-300 px-3 py-1 hover:bg-slate-50"
            >
              Next →
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
