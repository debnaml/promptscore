import { supabaseAdmin } from "@/lib/supabase";
import { CreateBatchForm } from "./create-batch-form";
import { BatchesTable } from "./batches-table";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

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
        <BatchesTable batches={batches ?? []} />
      )}

      {/* Create form */}
      <CreateBatchForm />
    </div>
  );
}
