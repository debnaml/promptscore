import Link from "next/link";
import { notFound } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase";
import { StatusSelect } from "../status-select";
import { saveAdminNotesAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function LeadDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [{ data: lead }, { data: history }] = await Promise.all([
    supabaseAdmin
      .from("leads")
      .select(
        "id, name, email, company, website, role, status, admin_notes, consent_marketing, unsubscribed, unsubscribed_at, created_at, scan_id, pdf_generated_at, scans(id, url, overall_score, category_scores, status, completed_at)"
      )
      .eq("id", id)
      .maybeSingle(),
    supabaseAdmin
      .from("lead_status_history")
      .select("from_status, to_status, admin_email, changed_at")
      .eq("lead_id", id)
      .order("changed_at", { ascending: false }),
  ]);

  if (!lead) notFound();

  type Scan = {
    id: string;
    url: string;
    overall_score: number | null;
    category_scores: Record<string, number> | null;
    status: string;
    completed_at: string | null;
  };

  const scan = lead.scans as unknown as Scan | null;

  return (
    <div className="p-6 max-w-4xl">
      <div className="mb-4">
        <Link href="/admin/leads" className="text-sm text-slate-500 hover:text-slate-800">
          ← Leads
        </Link>
      </div>

      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">{lead.name ?? lead.email}</h1>
          <p className="text-sm text-slate-500">{lead.email}</p>
        </div>
        <StatusSelect id={lead.id} status={lead.status} />
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <InfoCard title="Contact">
          <Row label="Email" value={lead.email} />
          <Row label="Name" value={lead.name} />
          <Row label="Company" value={lead.company} />
          <Row label="Role" value={lead.role} />
          <Row
            label="Website"
            value={
              lead.website ? (
                <a href={lead.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                  {lead.website}
                </a>
              ) : null
            }
          />
        </InfoCard>

        <InfoCard title="Consent & activity">
          <Row label="Captured" value={fmt(lead.created_at)} />
          <Row label="Marketing opt-in" value={lead.consent_marketing ? "Yes" : "No"} />
          <Row label="Unsubscribed" value={lead.unsubscribed ? `Yes (${fmt(lead.unsubscribed_at)})` : "No"} />
          <Row label="PDF generated" value={fmt(lead.pdf_generated_at)} />
        </InfoCard>
      </div>

      {scan && (
        <div className="mb-6 bg-white rounded-md border border-slate-200 p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-medium text-slate-800">Latest scan</h2>
            <Link
              href={`/admin/scans/${scan.id}`}
              className="text-sm text-blue-600 hover:underline"
            >
              View full report →
            </Link>
          </div>
          <div className="flex items-center gap-6 mb-3">
            <div className="text-3xl font-bold text-slate-900">{scan.overall_score ?? "—"}</div>
            <div>
              <div className="text-sm text-slate-600">{scan.url}</div>
              <div className="text-xs text-slate-400">Completed {fmt(scan.completed_at)}</div>
            </div>
          </div>
          {scan.category_scores && (
            <div className="grid grid-cols-3 gap-2">
              {Object.entries(scan.category_scores).map(([cat, score]) => (
                <div key={cat} className="bg-slate-50 rounded p-2 text-xs">
                  <div className="text-slate-500 capitalize">{cat.replace(/_/g, " ")}</div>
                  <div className="font-semibold text-slate-800">{score}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Admin notes */}
      <div className="mb-6 bg-white rounded-md border border-slate-200 p-4">
        <h2 className="font-medium text-slate-800 mb-2">Admin notes</h2>
        <form action={saveAdminNotesAction}>
          <input type="hidden" name="id" value={lead.id} />
          <textarea
            name="admin_notes"
            defaultValue={lead.admin_notes ?? ""}
            rows={4}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Internal notes…"
          />
          <button
            type="submit"
            className="mt-2 rounded-md bg-slate-900 text-white text-sm px-3 py-1.5 hover:bg-slate-800"
          >
            Save notes
          </button>
        </form>
      </div>

      {/* Status history */}
      {history && history.length > 0 && (
        <div className="bg-white rounded-md border border-slate-200 p-4">
          <h2 className="font-medium text-slate-800 mb-3">Status history</h2>
          <ol className="space-y-2">
            {history.map((h, i) => (
              <li key={i} className="flex items-center gap-3 text-sm">
                <span className="text-slate-400 text-xs w-36 shrink-0">{fmt(h.changed_at)}</span>
                <span className="text-slate-500 line-through">{h.from_status ?? "—"}</span>
                <span className="text-slate-400">→</span>
                <span className="font-medium text-slate-800">{h.to_status}</span>
                <span className="text-slate-400 text-xs">{h.admin_email}</span>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}

function fmt(v: string | null | undefined) {
  if (!v) return "—";
  return new Date(v).toLocaleString();
}

function InfoCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-md border border-slate-200 p-4">
      <h2 className="font-medium text-slate-800 mb-3">{title}</h2>
      <dl className="space-y-1">{children}</dl>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex gap-2 text-sm">
      <dt className="text-slate-500 w-32 shrink-0">{label}</dt>
      <dd className="text-slate-800">{value ?? "—"}</dd>
    </div>
  );
}
