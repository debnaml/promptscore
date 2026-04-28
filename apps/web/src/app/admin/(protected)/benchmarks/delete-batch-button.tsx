"use client";

import { deleteBatchAction } from "./actions";

export function DeleteBatchButton({ batchId, name }: { batchId: string; name: string }) {
  return (
    <form
      action={deleteBatchAction}
      onSubmit={(e) => {
        if (!confirm(`Delete benchmark "${name}"? This also removes all its scan results.`)) {
          e.preventDefault();
        }
      }}
      className="inline"
    >
      <input type="hidden" name="batch_id" value={batchId} />
      <button
        type="submit"
        className="text-red-500 hover:text-red-700 text-xs"
        title="Delete batch"
      >
        Delete
      </button>
    </form>
  );
}
