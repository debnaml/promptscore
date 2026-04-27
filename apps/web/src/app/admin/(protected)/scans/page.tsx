import Link from "next/link";
import { supabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";

const SORT_FIELDS = new Set(["created_at", "url", "overall_score", "status"]);

type SearchParams = {
  q?: string;
  status?: string;
  sort?: string;
  dir?: string;
};

type ScanRow = {
  id: string;
  url: string;
  overall_score: number | null;
  status: string;
  detected_category: string | null;
  completed_at: string | null;
  created_at: string;
};

const STATUS_COLOURS: Record<string, string> = {
  complete: "bg-emerald-50 text-emerald-700",
  failed: "bg-red-50 text-red-700",
  running: "bg-blue-50 text-blue-700",
  queued: "bg-slate-100 text-slate-600",
};

export default async function ScansPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const q = (sp.q ?? "").trim();
  const status = sp.status ?? "";
  const sort = SORT_FIELDS.has(sp.sort ?? "") ? sp.sort! : "created_at";
  const dir = sp.dir === "asc" ? "asc" : "desc";

  let query = supabaseAdmin
    .from("scans")
    .select("id, url, overall_score, status, detected_category, completed_at, created_at")
    .order(sort, { ascending: dir === "asc", nullsFirst: false })
    .limit(500);

  if (q) query = query.ilike("url", `%${q}%`);
  if (status) query = query.eq("status", status);

  const { data, error } = await query;

  if (error) {
    return (
      <div className="p-6">
        <h1 className="text-xl font-semibold mb-2">Scans</h1>
        <p className="text-red-600 text-sm">Error: {error.message}</p>
      </div>
    );
  }

  const rows = (data ?? []) as ScanRow[];

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-semibold text-slate-900">Scans</h1>
      </div>

      <form className="flex flex-wrap gap-2 mb-4 text-sm" method="get">
        <input
          name="q"
          defaultValue={q}
          placeholder="Search URL"
          className="rounded-md border border-slate-300 px-3 py-1.5 w-72"
        />
        <select
          name="status"
          defaultValue={status}
          className="rounded-md border border-slate-300 px-2 py-1.5"
        >
          <option value="">All statuses</option>
          {["complete", "running", "queued", "failed"].map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <input type="hidden" name="sort" value={sort} />
        <input type="hidden" name="dir" value={dir} />
        <button className="rounded-md bg-slate-900 text-white px-3 py-1.5">Apply</button>
        <Link href="/admin/scans" className="rounded-md border border-slate-300 px-3 py-1.5 hover:bg-slate-100">
          Reset
        </Link>
      </form>

      <p className="text-xs text-slate-500 mb-2">{rows.length} result{rows.length === 1 ? "" : "s"}</p>

      <div className="bg-white rounded-md border border-slate-200 overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <SortableHeader label="Scanned" field="created_at" sort={sort} dir={dir} sp={sp} />
              <SortableHeader label="URL" field="url" sort={sort} dir={dir} sp={sp} />
              <th className="px-3 py-2">Category</th>
              <SortableHeader label="Score" field="overall_score" sort={sort} dir={dir} sp={sp} />
              <SortableHeader label="Status" field="status" sort={sort} dir={dir} sp={sp} />
              <th className="px-3 py-2">Completed</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-slate-100">
                <td className="px-3 py-2 text-slate-500 whitespace-nowrap text-xs">
                  {new Date(r.created_at).toLocaleString()}
                </td>
                <td className="px-3 py-2 max-w-xs truncate">
                  <Link href={`/admin/scans/${r.id}`} className="text-blue-600 hover:underline">
                    {r.url}
                  </Link>
                </td>
                <td className="px-3 py-2 text-xs text-slate-600 capitalize">
                  {r.detected_category?.replace(/_/g, " ") ?? "—"}
                </td>
                <td className="px-3 py-2 font-mono text-xs font-semibold">
                  {r.overall_score ?? "—"}
                </td>
                <td className="px-3 py-2">
                  <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLOURS[r.status] ?? "bg-slate-100 text-slate-600"}`}>
                    {r.status}
                  </span>
                </td>
                <td className="px-3 py-2 text-xs text-slate-500 whitespace-nowrap">
                  {r.completed_at ? new Date(r.completed_at).toLocaleString() : "—"}
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="px-3 py-6 text-center text-slate-500">
                  No scans match the current filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SortableHeader({
  label, field, sort, dir, sp,
}: {
  label: string; field: string; sort: string; dir: string; sp: SearchParams;
}) {
  const isActive = sort === field;
  const nextDir = isActive && dir === "desc" ? "asc" : "desc";
  const params = new URLSearchParams();
  if (sp.q) params.set("q", sp.q);
  if (sp.status) params.set("status", sp.status);
  params.set("sort", field);
  params.set("dir", nextDir);
  return (
    <th className="px-3 py-2">
      <Link href={`/admin/scans?${params.toString()}`} className="hover:text-slate-900">
        {label}{isActive && (dir === "desc" ? " ↓" : " ↑")}
      </Link>
    </th>
  );
}
