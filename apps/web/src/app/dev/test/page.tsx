"use client";

import { useState } from "react";

interface FetchResult {
  canonical?: string;
  urlHash?: string;
  robots?: {
    present: boolean;
    status: number | null;
    userAgents: string[];
    sitemapUrls: string[];
    gptBotAllowed: boolean;
    claudeBotAllowed: boolean;
    googlebotAllowed: boolean;
    hasExplicitGptBot: boolean;
    raw: string | null;
  };
  sitemap?: {
    present: boolean;
    sourceUrl: string | null;
    totalUrls: number;
    sample: Array<{ loc: string; lastmod?: string }>;
    errors: string[];
  };
  llmsTxt?: {
    present: boolean;
    valid: boolean;
    hasFullVersion: boolean;
    errors: string[];
    raw: string | null;
  };
  staticHtml?: {
    ok: boolean;
    status?: number;
    redirectChain?: string[];
    htmlLength?: number;
    contentType?: string | null;
    snippet?: string;
    kind?: string;
    message?: string;
  };
  error?: string;
}

function Badge({
  ok,
  label,
}: {
  ok: boolean;
  label: string;
}) {
  return (
    <span
      className={`inline-block rounded px-2 py-0.5 text-xs font-semibold ${
        ok ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
      }`}
    >
      {label}
    </span>
  );
}

export default function DevTestPage() {
  const [url, setUrl] = useState("https://performancepeak.co.uk");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<FetchResult | null>(null);
  const [elapsed, setElapsed] = useState<number | null>(null);

  async function run() {
    setLoading(true);
    setResult(null);
    setElapsed(null);
    const start = Date.now();
    try {
      const res = await fetch("/api/dev/fetch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const data = await res.json();
      setResult(data);
      setElapsed(Date.now() - start);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-12 font-mono text-sm">
      <h1 className="mb-1 text-2xl font-bold tracking-tight">
        PromptScore — Dev Tester
      </h1>
      <p className="mb-8 text-gray-500">
        Enter any URL to see what the fetch engine finds.
      </p>

      <div className="flex gap-2 mb-8">
        <input
          type="text"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !loading && run()}
          className="flex-1 rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
          placeholder="https://example.com"
        />
        <button
          onClick={run}
          disabled={loading}
          className="rounded bg-black px-5 py-2 text-sm text-white hover:bg-gray-800 disabled:opacity-50"
        >
          {loading ? "Scanning…" : "Scan"}
        </button>
      </div>

      {loading && (
        <p className="text-gray-400 animate-pulse">Fetching robots.txt and sitemap…</p>
      )}

      {result && !loading && (
        <div className="space-y-6">
          {result.error && (
            <div className="rounded border border-red-200 bg-red-50 p-4 text-red-700">
              {result.error}
            </div>
          )}

          {result.canonical && (
            <section>
              <h2 className="mb-2 font-bold text-base">URL</h2>
              <table className="w-full text-left text-xs border-collapse">
                <tbody>
                  <tr className="border-b">
                    <td className="py-1 pr-4 text-gray-500 w-32">Canonical</td>
                    <td className="py-1 break-all">{result.canonical}</td>
                  </tr>
                  <tr>
                    <td className="py-1 pr-4 text-gray-500">Hash</td>
                    <td className="py-1 break-all text-gray-400">{result.urlHash}</td>
                  </tr>
                </tbody>
              </table>
            </section>
          )}

          {result.robots && (
            <section>
              <h2 className="mb-2 font-bold text-base">robots.txt</h2>
              <div className="mb-3 flex flex-wrap gap-2">
                <Badge ok={result.robots.present} label={result.robots.present ? "Present" : "Missing"} />
                <Badge ok={result.robots.gptBotAllowed} label={`GPTBot ${result.robots.gptBotAllowed ? "✓ allowed" : "✗ blocked"}`} />
                <Badge ok={result.robots.claudeBotAllowed} label={`ClaudeBot ${result.robots.claudeBotAllowed ? "✓ allowed" : "✗ blocked"}`} />
                <Badge ok={result.robots.googlebotAllowed} label={`Googlebot ${result.robots.googlebotAllowed ? "✓ allowed" : "✗ blocked"}`} />
              </div>
              {result.robots.userAgents.length > 0 && (
                <p className="text-xs text-gray-500 mb-2">
                  User-agents: {result.robots.userAgents.join(", ")}
                </p>
              )}
              {result.robots.sitemapUrls.length > 0 && (
                <p className="text-xs text-gray-500 mb-2">
                  Sitemaps in robots.txt: {result.robots.sitemapUrls.join(", ")}
                </p>
              )}
              {result.robots.raw && (
                <details className="mt-2">
                  <summary className="cursor-pointer text-xs text-gray-400 hover:text-gray-600">
                    View raw robots.txt
                  </summary>
                  <pre className="mt-2 rounded bg-gray-50 border p-3 text-xs overflow-auto max-h-48 whitespace-pre-wrap">
                    {result.robots.raw}
                  </pre>
                </details>
              )}
            </section>
          )}

          {result.sitemap && (
            <section>
              <h2 className="mb-2 font-bold text-base">sitemap.xml</h2>
              <div className="mb-3 flex flex-wrap gap-2">
                <Badge ok={result.sitemap.present} label={result.sitemap.present ? "Present" : "Not found"} />
                {result.sitemap.present && (
                  <span className="inline-block rounded px-2 py-0.5 text-xs font-semibold bg-blue-100 text-blue-800">
                    {result.sitemap.totalUrls} URLs
                  </span>
                )}
              </div>
              {result.sitemap.sourceUrl && (
                <p className="text-xs text-gray-500 mb-2">Source: {result.sitemap.sourceUrl}</p>
              )}
              {result.sitemap.sample.length > 0 && (
                <details>
                  <summary className="cursor-pointer text-xs text-gray-400 hover:text-gray-600">
                    First {result.sitemap.sample.length} URLs
                  </summary>
                  <ul className="mt-2 space-y-0.5 text-xs">
                    {result.sitemap.sample.map((e, i) => (
                      <li key={i} className="flex gap-2">
                        <span className="text-gray-400 w-4">{i + 1}.</span>
                        <span className="break-all">{e.loc}</span>
                        {e.lastmod && <span className="text-gray-400 shrink-0">{e.lastmod}</span>}
                      </li>
                    ))}
                  </ul>
                </details>
              )}
              {result.sitemap.errors.length > 0 && (
                <div className="mt-2 text-xs text-red-600">
                  {result.sitemap.errors.map((e, i) => <p key={i}>{e}</p>)}
                </div>
              )}
            </section>
          )}

          {result.llmsTxt && (
            <section>
              <h2 className="mb-2 font-bold text-base">llms.txt</h2>
              <div className="mb-3 flex flex-wrap gap-2">
                <Badge ok={result.llmsTxt.present} label={result.llmsTxt.present ? "Present" : "Not found"} />
                {result.llmsTxt.present && (
                  <Badge ok={result.llmsTxt.valid} label={result.llmsTxt.valid ? "Valid" : "Invalid"} />
                )}
                {result.llmsTxt.hasFullVersion && (
                  <span className="inline-block rounded px-2 py-0.5 text-xs font-semibold bg-blue-100 text-blue-800">
                    llms-full.txt also present
                  </span>
                )}
              </div>
              {result.llmsTxt.errors.length > 0 && (
                <div className="mb-2 text-xs text-red-600">
                  {result.llmsTxt.errors.map((e, i) => <p key={i}>{e}</p>)}
                </div>
              )}
              {result.llmsTxt.raw && (
                <details className="mt-2">
                  <summary className="cursor-pointer text-xs text-gray-400 hover:text-gray-600">
                    View raw llms.txt
                  </summary>
                  <pre className="mt-2 rounded bg-gray-50 border p-3 text-xs overflow-auto max-h-48 whitespace-pre-wrap">
                    {result.llmsTxt.raw}
                  </pre>
                </details>
              )}
            </section>
          )}

          {result.staticHtml && (
            <section>
              <h2 className="mb-2 font-bold text-base">Static HTML fetch</h2>
              <div className="mb-3 flex flex-wrap gap-2">
                <Badge ok={result.staticHtml.ok} label={result.staticHtml.ok ? `HTTP ${result.staticHtml.status}` : "Failed"} />
                {!result.staticHtml.ok && result.staticHtml.kind && (
                  <span className="inline-block rounded px-2 py-0.5 text-xs font-semibold bg-orange-100 text-orange-800">
                    {result.staticHtml.kind}
                  </span>
                )}
                {result.staticHtml.ok && result.staticHtml.htmlLength != null && (
                  <span className="inline-block rounded px-2 py-0.5 text-xs font-semibold bg-blue-100 text-blue-800">
                    {(result.staticHtml.htmlLength / 1024).toFixed(1)} KB
                  </span>
                )}
                {result.staticHtml.contentType && (
                  <span className="inline-block rounded px-2 py-0.5 text-xs font-semibold bg-gray-100 text-gray-700">
                    {result.staticHtml.contentType.split(";")[0]}
                  </span>
                )}
              </div>
              {result.staticHtml.redirectChain && result.staticHtml.redirectChain.length > 0 && (
                <p className="text-xs text-gray-500 mb-2">
                  Redirected via: {result.staticHtml.redirectChain.join(" → ")}
                </p>
              )}
              {!result.staticHtml.ok && result.staticHtml.message && (
                <p className="text-xs text-red-600 mb-2">{result.staticHtml.message}</p>
              )}
              {result.staticHtml.snippet && (
                <details className="mt-2">
                  <summary className="cursor-pointer text-xs text-gray-400 hover:text-gray-600">
                    View HTML snippet (first 500 chars)
                  </summary>
                  <pre className="mt-2 rounded bg-gray-50 border p-3 text-xs overflow-auto max-h-48 whitespace-pre-wrap">
                    {result.staticHtml.snippet}
                  </pre>
                </details>
              )}
            </section>
          )}

          {elapsed !== null && (
            <p className="text-xs text-gray-400">Completed in {elapsed}ms</p>
          )}
        </div>
      )}
    </main>
  );
}
