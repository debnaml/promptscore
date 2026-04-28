"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

const CATEGORIES = [
  { key: "crawler_access",  label: "Crawler" },
  { key: "structured_data", label: "Structured" },
  { key: "content_clarity", label: "Content" },
  { key: "ai_specific",     label: "AI" },
  { key: "authority_trust", label: "Authority" },
];

const STATUS_BADGE: Record<string, string> = {
  pending:  "bg-slate-100 text-slate-500",
  running:  "bg-blue-100 text-blue-700",
  complete: "bg-green-100 text-green-700",
  failed:   "bg-red-100 text-red-700",
};

function scoreColor(score: number | null | undefined): string {
  if (score == null) return "bg-slate-100 text-slate-400";
  if (score >= 70) return "bg-green-100 text-green-800";
  if (score >= 40) return "bg-yellow-100 text-yellow-800";
  return "bg-red-100 text-red-800";
}

export type CheckMeta = { key: string; category: string; title: string };

export type ResultRow = {
  id: string;
  url: string;
  label: string | null;
  position: number;
  status: string;
  error: string | null;
  scan_id: string | null;
  hostname: string;
  scanUrl: string;
  overall: number | null;
  category_scores: Record<string, number> | null;
  /** raw 0–1 score per check key (null if not_scored) */
  check_scores: Record<string, number | null>;
  topGap: string | null;
};

type SortKey =
  | "rank"
  | "name"
  | "overall"
  | `cat:${string}`
  | `chk:${string}`;

type SortDir = "asc" | "desc";

export function ResultsTable({
  rows,
  checks,
}: {
  rows: ResultRow[];
  checks: CheckMeta[];
}) {
  const [sortKey, setSortKey] = useState<SortKey>("overall");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [showChecks, setShowChecks] = useState(false);
  const [activeCats, setActiveCats] = useState<Set<string>>(
    () => new Set(CATEGORIES.map((c) => c.key))
  );

  const visibleChecks = useMemo(
    () => (showChecks ? checks.filter((c) => activeCats.has(c.category)) : []),
    [checks, showChecks, activeCats]
  );

  const sorted = useMemo(() => {
    const complete = rows.filter((r) => r.status === "complete");
    const notComplete = rows.filter((r) => r.status !== "complete");

    const cmp = (a: ResultRow, b: ResultRow) => {
      let av: number | string | null;
      let bv: number | string | null;
      if (sortKey === "rank") {
        av = a.position; bv = b.position;
      } else if (sortKey === "name") {
        av = (a.label || a.hostname).toLowerCase();
        bv = (b.label || b.hostname).toLowerCase();
      } else if (sortKey === "overall") {
        av = a.overall ?? -1; bv = b.overall ?? -1;
      } else if (sortKey.startsWith("cat:")) {
        const k = sortKey.slice(4);
        av = a.category_scores?.[k] ?? -1;
        bv = b.category_scores?.[k] ?? -1;
      } else {
        const k = sortKey.slice(4);
        av = a.check_scores[k] ?? -1;
        bv = b.check_scores[k] ?? -1;
      }
      if (av == null) av = -1;
      if (bv == null) bv = -1;
      const r = av < bv ? -1 : av > bv ? 1 : 0;
      return sortDir === "asc" ? r : -r;
    };

    return [...complete.sort(cmp), ...notComplete];
  }, [rows, sortKey, sortDir]);

  function setSort(k: SortKey) {
    if (sortKey === k) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(k);
      // Sensible default direction: desc for numeric, asc for text
      setSortDir(k === "name" || k === "rank" ? "asc" : "desc");
    }
  }

  function toggleCat(cat: string) {
    setActiveCats((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  }

  const arrow = (k: SortKey) =>
    sortKey === k ? (sortDir === "asc" ? "↑" : "↓") : "";

  return (
    <div>
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3 mb-3 text-xs">
        <label className="flex items-center gap-1.5 cursor-pointer">
          <input
            type="checkbox"
            checked={showChecks}
            onChange={(e) => setShowChecks(e.target.checked)}
            className="h-3.5 w-3.5"
          />
          <span>Show individual check columns ({checks.length})</span>
        </label>
        {showChecks && (
          <div className="flex items-center gap-2 border-l border-slate-200 pl-3">
            <span className="text-slate-400">Categories:</span>
            {CATEGORIES.map((c) => (
              <label key={c.key} className="flex items-center gap-1 cursor-pointer">
                <input
                  type="checkbox"
                  checked={activeCats.has(c.key)}
                  onChange={() => toggleCat(c.key)}
                  className="h-3.5 w-3.5"
                />
                <span>{c.label}</span>
              </label>
            ))}
          </div>
        )}
      </div>

      <div className="bg-white rounded-md border border-slate-200 overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-400 border-b border-slate-100">
            <tr>
              <Th onClick={() => setSort("rank")} className="w-8 text-left">
                # {arrow("rank")}
              </Th>
              <Th onClick={() => setSort("name")} className="text-left">
                URL / Label {arrow("name")}
              </Th>
              <Th onClick={() => setSort("overall")} className="text-center">
                Overall {arrow("overall")}
              </Th>
              {CATEGORIES.map((c) => (
                <Th
                  key={c.key}
                  onClick={() => setSort(`cat:${c.key}`)}
                  className="text-center"
                >
                  {c.label} {arrow(`cat:${c.key}`)}
                </Th>
              ))}
              {visibleChecks.map((c) => (
                <Th
                  key={c.key}
                  onClick={() => setSort(`chk:${c.key}`)}
                  className="text-center whitespace-nowrap"
                  title={c.title}
                >
                  <span className="text-[10px] normal-case font-normal">{c.title}</span>{" "}
                  {arrow(`chk:${c.key}`)}
                </Th>
              ))}
              <th className="px-3 py-2 text-left">Top gap</th>
              <th className="px-3 py-2 text-left">Status</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((r, idx) => {
              const displayName = r.label || r.hostname;
              const rank =
                r.status === "complete" && sortKey === "overall" && sortDir === "desc"
                  ? idx + 1
                  : r.status === "complete"
                  ? "—"
                  : "—";
              return (
                <tr key={r.id} className="border-t border-slate-100 align-top">
                  <td className="px-3 py-2 text-slate-400 text-xs tabular-nums">{rank}</td>
                  <td className="px-3 py-2 max-w-[180px]">
                    <div className="font-medium text-slate-900 truncate" title={r.url}>
                      {r.scan_id ? (
                        <Link
                          href={`/admin/scans/${r.scan_id}`}
                          prefetch={false}
                          className="hover:underline text-blue-700"
                        >
                          {displayName}
                        </Link>
                      ) : (
                        displayName
                      )}
                    </div>
                    <div className="text-xs text-slate-400 truncate" title={r.url}>
                      <a
                        href={r.scanUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:underline"
                      >
                        {r.hostname}
                      </a>
                    </div>
                  </td>
                  <td className="px-3 py-2 text-center">
                    <ScoreCell score={r.overall} />
                  </td>
                  {CATEGORIES.map((c) => (
                    <td key={c.key} className="px-3 py-2 text-center">
                      <ScoreCell score={r.category_scores?.[c.key] ?? null} />
                    </td>
                  ))}
                  {visibleChecks.map((c) => (
                    <td key={c.key} className="px-3 py-2 text-center">
                      <ScoreCell score={r.check_scores[c.key] ?? null} small />
                    </td>
                  ))}
                  <td className="px-3 py-2 text-xs text-slate-600 max-w-[200px]">
                    {r.topGap ? (
                      <span title={r.topGap} className="line-clamp-2">{r.topGap}</span>
                    ) : (
                      <span className="text-slate-300">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_BADGE[r.status] ?? ""}`}>
                      {r.status}
                    </span>
                    {r.error && (
                      <p className="text-xs text-red-500 mt-0.5" title={r.error}>
                        {r.error.slice(0, 60)}
                      </p>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Th({
  children,
  onClick,
  className = "",
  title,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
  title?: string;
}) {
  return (
    <th
      onClick={onClick}
      title={title}
      className={`px-3 py-2 ${onClick ? "cursor-pointer hover:text-slate-600 select-none" : ""} ${className}`}
    >
      {children}
    </th>
  );
}

function ScoreCell({ score, small = false }: { score: number | null; small?: boolean }) {
  if (score == null) return <span className="text-slate-300 text-xs">—</span>;
  return (
    <span
      className={`inline-block rounded ${small ? "px-1 py-0 text-[10px]" : "px-2 py-0.5 text-xs"} font-bold tabular-nums ${scoreColor(score)}`}
    >
      {score}
    </span>
  );
}
