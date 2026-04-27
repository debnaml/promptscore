"use client";

import { useFormState, useFormStatus } from "react-dom";
import { createBatchAction } from "./actions";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-md bg-slate-900 text-white text-sm font-medium px-4 py-2 hover:bg-slate-800 disabled:opacity-50"
    >
      {pending ? "Starting…" : "Start batch"}
    </button>
  );
}

export function CreateBatchForm() {
  const [error, action] = useFormState(createBatchAction, null);

  return (
    <div id="new" className="bg-white rounded-md border border-slate-200 p-5">
      <h2 className="text-sm font-semibold text-slate-800 mb-4">New benchmark batch</h2>

      {error && (
        <div className="mb-4 rounded-md bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      <form action={action} className="space-y-4">
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

        <SubmitButton />
      </form>
    </div>
  );
}
