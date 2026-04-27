"use client";

import { useTransition } from "react";
import { updateLeadStatusAction } from "./actions";

const STATUSES = ["new", "contacted", "qualified", "converted", "not_a_fit"] as const;

export function StatusSelect({ id, status }: { id: string; status: string }) {
  const [pending, startTransition] = useTransition();

  return (
    <select
      value={status}
      disabled={pending}
      onChange={(e) => {
        const newStatus = e.target.value;
        const fd = new FormData();
        fd.set("id", id);
        fd.set("status", newStatus);
        startTransition(() => updateLeadStatusAction(fd));
      }}
      className="rounded-md border border-slate-300 px-2 py-1 text-xs bg-white disabled:opacity-50"
    >
      {STATUSES.map((s) => (
        <option key={s} value={s}>{s}</option>
      ))}
    </select>
  );
}
