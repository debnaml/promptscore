"use client";

import { useState } from "react";

const CHECK_KEYS = [
  "robots_valid","sitemap_present","https_hsts","canonical_urls",
  "schema_org_present","structured_data_valid","publication_dates",
  "open_graph_tags","semantic_landmarks","alt_text_coverage",
  "heading_hierarchy","content_length","homepage_clarity_rubric",
  "query_coverage_rubric","citation_practice",
  "llms_txt_present","ai_bot_access","page_speed_score",
  "mobile_friendly","core_web_vitals",
  "author_bio","contact_info","about_page","privacy_policy",
];

type DiagResult = {
  ok: boolean;
  checkKey?: string;
  url?: string;
  latencyMs?: number;
  result?: {
    score: number | null;
    not_scored: boolean;
    notes: string | null;
    evidence: unknown;
  } | null;
  error?: string;
};

export default function DiagnosticsPage() {
  const [url, setUrl] = useState("");
  const [checkKey, setCheckKey] = useState(CHECK_KEYS[0]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<DiagResult | null>(null);

  async function onRun(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/admin/diagnostics/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, checkKey }),
      });
      const data = await res.json();
      setResult(data);
    } catch (err) {
      setResult({ ok: false, error: String(err) });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-6 max-w-3xl">
      <h1 className="text-xl font-semibold text-slate-900 mb-2">Diagnostics</h1>
      <p className="text-sm text-slate-500 mb-6">
        Run a single check against a URL in isolation. Useful for debugging rubric changes.
      </p>

      <form onSubmit={onRun} className="flex flex-wrap gap-3 mb-6">
        <input
          type="url"
          required
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://example.com"
          className="rounded-md border border-slate-300 px-3 py-2 text-sm flex-1 min-w-52 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <select
          value={checkKey}
          onChange={(e) => setCheckKey(e.target.value)}
          className="rounded-md border border-slate-300 px-2 py-2 text-sm bg-white"
        >
          {CHECK_KEYS.map((k) => (
            <option key={k} value={k}>{k}</option>
          ))}
        </select>
        <button
          type="submit"
          disabled={loading}
          className="rounded-md bg-slate-900 text-white text-sm font-medium px-4 py-2 hover:bg-slate-800 disabled:opacity-50"
        >
          {loading ? "Running…" : "Run check"}
        </button>
      </form>

      {result && (
        <div className="space-y-4">
          {result.error ? (
            <div className="rounded-md bg-red-50 border border-red-200 p-4 text-sm text-red-800">
              <strong>Error:</strong> {result.error}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-3 gap-3">
                <StatBox label="Score" value={result.result?.score != null ? String(result.result.score) : "—"} />
                <StatBox label="Status" value={result.result?.not_scored ? "not scored" : "scored"} />
                <StatBox label="Latency" value={`${result.latencyMs}ms`} />
              </div>

              {result.result?.notes && (
                <div className="bg-white rounded-md border border-slate-200 p-3">
                  <div className="text-xs font-medium text-slate-500 mb-1">Notes</div>
                  <div className="text-sm text-slate-800">{result.result.notes}</div>
                </div>
              )}

              {result.result?.evidence && (
                <div className="bg-white rounded-md border border-slate-200 p-3">
                  <div className="text-xs font-medium text-slate-500 mb-1">Evidence</div>
                  <pre className="text-xs bg-slate-50 rounded p-2 overflow-x-auto whitespace-pre-wrap break-all max-h-96">
                    {JSON.stringify(result.result.evidence, null, 2)}
                  </pre>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

function StatBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white rounded-md border border-slate-200 p-3 text-center">
      <div className="text-xs text-slate-500 mb-0.5">{label}</div>
      <div className="text-lg font-semibold text-slate-900 tabular-nums">{value}</div>
    </div>
  );
}
