import Link from "next/link";
import { supabaseAdmin } from "@/lib/supabase";
import { StatusSelect } from "./status-select";

export const dynamic = "force-dynamic";

const STATUSES = ["new", "contacted", "qualified", "converted", "not_a_fit"] as const;
const SORT_FIELDS = new Set(["created_at", "name", "email", "company", "status"]);

type SearchParams = {
  q?: string;
  status?: string;
  sort?: string;
  dir?: string;
  score_min?: string;
  score_max?: string;
};

type LeadRow = {
  id: string;
  name: string | null;
  email: string;
  company: string | null;
  website: string | null;
  role: string | null;
  status: string;
  consent_marketing: boolean;
  unsubscribed: boolean | null;
  created_at: string;
  scan_id: string | null;
  scans: { overall_score: number | null } | null;
};

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const q = (sp.q ?? "").trim();
  const status = sp.status ?? "";
  const sort = SORT_FIELDS.has(sp.sort ?? "") ? sp.sort! : "created_at";
  const dir = sp.dir === "asc" ? "asc" : "desc";
  const scoreMin = sp.score_min ? Number(sp.score_min) : null;
  const scoreMax = sp.score_max ? Number(sp.score_max) : null;

  let query = supabaseAdmin
    .from("leads")
    .select("id, name, email, company, website, role, status, consent_marketing, unsubscribed, created_at, scan_id, scans(overall_score)")
    .order(sort, { ascending: dir === "asc" })
    .limit(500);

  if (q) {
    query = query.or(
      `email.ilike.%${q}%,name.ilike.%${q}%,company.ilike.%${q}%,website.ilike.%${q}%`
    );
  }
  if (status && STATUSES.includes(status as (typeof STATUSES)[number])) {
    query = query.eq("status", status);
  }

  const { data, error } = await query;
  if (error) {
    return (
      <div className="p-6">
        <h1 className="text-xl font-semibold mb-2">Leads</h1>
        <p className="text-red-600 text-sm">Error: {error.message}</p>
      </div>
    );
  }

  let rows = (data ?? []) as unknown as LeadRow[];

  // Apply score filter client-side (Supabase can't filter on a joined column easily here)
  if (scoreMin != null || scoreMax != null) {
    rows = rows.filter((r) => {
      const s = r.scans?.overall_score ?? null;
      if (s == null) return false;
      if (scoreMin != null && s < scoreMin) return false;
      if (scoreMax != null && s > scoreMax) return false;
      return true;
    });
  }

  const exportParams = new URLSearchParams();
  if (q) exportParams.set("q", q);
  if (status) exportParams.set("status", status);
  if (sp.score_min) exportParams.set("score_min", sp.score_min);
  if (sp.score_max) exportParams.set("score_max", sp.score_max);

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-semibold text-slate-900">Leads</h1>
        <a
          href={`/api/admin/leads/export?${exportParams.toString()}`}
          className="text-sm rounded-md border border-slate-300 px-3 py-1.5 hover:bg-slate-100"
        >
          Export CSV
        </a>
      </div>

      <form className="flex flex-wrap gap-2 mb-4 text-sm" method="get">
        <input
          name="q"
          defaultValue={q}
          placeholder="Search email / name / company / website"
          className="rounded-md border border-slate-300 px-3 py-1.5 w-72"
        />
        <select
          name="status"
          defaultValue={status}
          className="rounded-md border border-slate-300 px-2 py-1.5"
        >
          <option value="">All statuses</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <input
          name="score_min"
          defaultValue={sp.score_min ?? ""}
          placeholder="Min score"
          type="number"
          className="rounded-md border border-slate-300 px-2 py-1.5 w-24"
        />
        <input
          name="score_max"
          defaultValue={sp.score_max ?? ""}
          placeholder="Max score"
          type="number"
          className="rounded-md border border-slate-300 px-2 py-1.5 w-24"
        />
        <input type="hidden" name="sort" value={sort} />
        <input type="hidden" name="dir" value={dir} />
        <button className="rounded-md bg-slate-900 text-white px-3 py-1.5">Apply</button>
        <Link
          href="/admin/leads"
          className="rounded-md border border-slate-300 px-3 py-1.5 hover:bg-slate-100"
        >
          Reset
        </Link>
      </form>

      <p className="text-xs text-slate-500 mb-2">{rows.length} result{rows.length === 1 ? "" : "s"}</p>

      <div className="bg-white rounded-md border border-slate-200 overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <SortableHeader label="Captured" field="created_at" sort={sort} dir={dir} sp={sp} />
              <SortableHeader label="Email" field="email" sort={sort} dir={dir} sp={sp} />
              <SortableHeader label="Name" field="name" sort={sort} dir={dir} sp={sp} />
              <SortableHeader label="Company" field="company" sort={sort} dir={dir} sp={sp} />
              <th className="px-3 py-2">Website</th>
              <th className="px-3 py-2">Score</th>
              <th className="px-3 py-2">Marketing</th>
              <SortableHeader label="Status" field="status" sort={sort} dir={dir} sp={sp} />
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-slate-100">
                <td className="px-3 py-2 text-slate-600 whitespace-nowrap">
                  {new Date(r.created_at).toLocaleString()}
                </td>
                <td className="px-3 py-2">
                  <Link
                    href={`/admin/leads/${r.id}`}
                    className="text-blue-600 hover:underline"
                  >
                    {r.email}
                  </Link>
                  {r.unsubscribed && (
                    <span className="ml-1 text-xs text-red-600">(unsub)</span>
                  )}
                </td>
                <td className="px-3 py-2">{r.name ?? "—"}</td>
                <td className="px-3 py-2">{r.company ?? "—"}</td>
                <td className="px-3 py-2">
                  {r.website ? (
                    <a
                      href={r.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-slate-700 hover:underline"
                    >
                      {(() => { try { return new URL(r.website).hostname; } catch { return r.website; } })()}
                    </a>
                  ) : "—"}
                </td>
                <td className="px-3 py-2 font-mono text-xs">
                  {r.scans?.overall_score ?? "—"}
                </td>
                <td className="px-3 py-2">
                  {r.consent_marketing ? (
                    <span className="inline-flex items-center rounded-full bg-emerald-50 text-emerald-700 px-2 py-0.5 text-xs">opted in</span>
                  ) : (
                    <span className="text-xs text-slate-400">no</span>
                  )}
                </td>
                <td className="px-3 py-2">
                  <StatusSelect id={r.id} status={r.status} />
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={8} className="px-3 py-6 text-center text-slate-500">
                  No leads match the current filters.
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
  label,
  field,
  sort,
  dir,
  sp,
}: {
  label: string;
  field: string;
  sort: string;
  dir: string;
  sp: SearchParams;
}) {
  const isActive = sort === field;
  const nextDir = isActive && dir === "desc" ? "asc" : "desc";
  const params = new URLSearchParams();
  if (sp.q) params.set("q", sp.q);
  if (sp.status) params.set("status", sp.status);
  if (sp.score_min) params.set("score_min", sp.score_min);
  if (sp.score_max) params.set("score_max", sp.score_max);
  params.set("sort", field);
  params.set("dir", nextDir);
  return (
    <th className="px-3 py-2">
      <Link href={`/admin/leads?${params.toString()}`} className="hover:text-slate-900">
        {label}
        {isActive && (dir === "desc" ? " ↓" : " ↑")}
      </Link>
    </th>
  );
}
