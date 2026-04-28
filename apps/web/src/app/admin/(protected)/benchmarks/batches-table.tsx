"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { bulkDeleteBatchesAction } from "./actions";

const STATUS_BADGE: Record<string, string> = {
  pending:  "bg-slate-100 text-slate-600",
  running:  "bg-blue-100 text-blue-700",
  complete: "bg-green-100 text-green-700",
  failed:   "bg-red-100 text-red-700",
};

type Batch = {
  id: string;
  name: string;
  status: string;
  total_urls: number;
  completed_urls: number;
  failed_urls: number;
  created_at: string;
};

export function BatchesTable({ batches }: { batches: Batch[] }) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [action, setAction] = useState("");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const toggleAll = (checked: boolean) => {
    setSelected(checked ? new Set(batches.map((b) => b.id)) : new Set());
  };

  const toggleOne = (id: string, checked: boolean) => {
    const next = new Set(selected);
    if (checked) next.add(id); else next.delete(id);
    setSelected(next);
  };

  const applyAction = () => {
    if (action !== "delete" || selected.size === 0) return;
    const count = selected.size;
    if (!confirm(`Delete ${count} benchmark${count === 1 ? "" : "s"}? This also removes all their scan results.`)) return;
    const ids = Array.from(selected);
    startTransition(async () => {
      const res = await bulkDeleteBatchesAction(ids);
      if (res.error) {
        alert(`Delete failed: ${res.error}`);
        return;
      }
      setSelected(new Set());
      setAction("");
      router.refresh();
    });
  };

  const allChecked = batches.length > 0 && selected.size === batches.length;
  const someChecked = selected.size > 0 && !allChecked;

  return (
    <div className="bg-white rounded-md border border-slate-200 overflow-hidden mb-8">
      {/* Bulk action bar */}
      <div className="flex items-center gap-3 px-4 py-2 border-b border-slate-100 bg-slate-50 text-xs">
        <span className="text-slate-500">
          {selected.size > 0 ? `${selected.size} selected` : "No selection"}
        </span>
        <select
          value={action}
          onChange={(e) => setAction(e.target.value)}
          disabled={selected.size === 0 || isPending}
          className="rounded border border-slate-300 px-2 py-1 text-xs disabled:opacity-50"
        >
          <option value="">Bulk actions…</option>
          <option value="delete">Delete</option>
        </select>
        <button
          type="button"
          onClick={applyAction}
          disabled={!action || selected.size === 0 || isPending}
          className="rounded bg-slate-900 text-white px-3 py-1 text-xs hover:bg-slate-800 disabled:opacity-50"
        >
          {isPending ? "Working…" : "Apply"}
        </button>
      </div>

      <table className="min-w-full text-sm">
        <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-400 border-b border-slate-100">
          <tr>
            <th className="px-3 py-2 w-8">
              <input
                type="checkbox"
                checked={allChecked}
                ref={(el) => { if (el) el.indeterminate = someChecked; }}
                onChange={(e) => toggleAll(e.target.checked)}
                aria-label="Select all"
              />
            </th>
            <th className="px-4 py-2 text-left">Name</th>
            <th className="px-4 py-2 text-left">Status</th>
            <th className="px-4 py-2 text-left">Progress</th>
            <th className="px-4 py-2 text-left">Created</th>
            <th className="px-4 py-2" />
          </tr>
        </thead>
        <tbody>
          {batches.map((b) => {
            const pct = b.total_urls > 0
              ? Math.round(((b.completed_urls + b.failed_urls) / b.total_urls) * 100)
              : 0;
            const isSelected = selected.has(b.id);
            return (
              <tr key={b.id} className={`border-t border-slate-100 ${isSelected ? "bg-blue-50" : ""}`}>
                <td className="px-3 py-3">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={(e) => toggleOne(b.id, e.target.checked)}
                    aria-label={`Select ${b.name}`}
                  />
                </td>
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
  );
}
