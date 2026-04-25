"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

interface ScanRow {
  id: string;
  url: string;
  status: "queued" | "running" | "done" | "failed";
  overall_score: number | null;
  category_scores: Record<string, number> | null;
  summary: {
    positives?: Array<{ key: string; title?: string }>;
    negatives?: Array<{ key: string; title?: string }>;
    priority_actions?: Array<{ key: string; title?: string; howToFix?: string; effort?: string }>;
    not_scored_count?: number;
  } | null;
  error_message: string | null;
  created_at: string;
}

const STAGE_MESSAGES = [
  "Fetching your homepage…",
  "Checking robots.txt and sitemaps…",
  "Analysing structured data…",
  "Running content clarity checks…",
  "Checking AI-specific signals…",
  "Evaluating authority & trust signals…",
  "Applying AI-graded rubrics…",
  "Computing your final score…",
];

const CATEGORY_LABELS: Record<string, string> = {
  crawler_access: "Crawler Access",
  structured_data: "Structured Data",
  content_clarity: "Content Clarity",
  ai_specific: "AI-Specific Signals",
  authority_trust: "Authority & Trust",
};

const CATEGORY_ORDER = [
  "crawler_access",
  "structured_data",
  "content_clarity",
  "ai_specific",
  "authority_trust",
];

const CATEGORY_WEIGHTS: Record<string, number> = {
  crawler_access: 20,
  structured_data: 25,
  content_clarity: 25,
  ai_specific: 15,
  authority_trust: 15,
};

function scoreColor(score: number): string {
  if (score >= 75) return "text-green-600";
  if (score >= 55) return "text-yellow-600";
  if (score >= 35) return "text-orange-500";
  return "text-red-600";
}

function scoreBgColor(score: number): string {
  if (score >= 75) return "bg-green-500";
  if (score >= 55) return "bg-yellow-500";
  if (score >= 35) return "bg-orange-500";
  return "bg-red-500";
}

function getBandLabel(score: number): string {
  if (score >= 85) return "AI-Ready Leader";
  if (score >= 70) return "Solid Foundation";
  if (score >= 55) return "Partial Readiness";
  if (score >= 35) return "Significant Gaps";
  return "High Risk";
}

function ScoreGauge({ score }: { score: number }) {
  const radius = 60;
  const circumference = Math.PI * radius; // half-circle
  const progress = (score / 100) * circumference;
  const colorClass = scoreColor(score);

  return (
    <div className="flex flex-col items-center gap-2">
      <svg width="160" height="90" viewBox="0 0 160 90" aria-label={`Score: ${score} out of 100`}>
        {/* Background arc */}
        <path
          d={`M 10 80 A 70 70 0 0 1 150 80`}
          fill="none"
          stroke="currentColor"
          strokeWidth="10"
          className="text-muted"
        />
        {/* Score arc */}
        <path
          d={`M 10 80 A 70 70 0 0 1 150 80`}
          fill="none"
          stroke="currentColor"
          strokeWidth="10"
          strokeDasharray={`${(score / 100) * 219.9} 219.9`}
          className={colorClass}
          strokeLinecap="round"
        />
        {/* Score text */}
        <text x="80" y="72" textAnchor="middle" className="fill-foreground" fontSize="32" fontWeight="700">
          {score}
        </text>
        <text x="80" y="86" textAnchor="middle" className="fill-muted-foreground" fontSize="11">
          / 100
        </text>
      </svg>
      <span className={`font-semibold text-sm ${colorClass}`}>{getBandLabel(score)}</span>
    </div>
  );
}

function CategoryBar({ category, score }: { category: string; score: number }) {
  const label = CATEGORY_LABELS[category] ?? category;
  const weight = CATEGORY_WEIGHTS[category] ?? 0;
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span className="font-medium">{label}</span>
        <span className={`font-semibold ${scoreColor(score)}`}>{score}/100</span>
      </div>
      <div className="h-2 rounded-full bg-muted overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${scoreBgColor(score)}`}
          style={{ width: `${score}%` }}
        />
      </div>
      <div className="text-xs text-muted-foreground">{weight}% of overall score</div>
    </div>
  );
}

function ProgressState({ url }: { url: string }) {
  const [stageIdx, setStageIdx] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setStageIdx((i) => Math.min(i + 1, STAGE_MESSAGES.length - 1));
    }, 7000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="max-w-lg mx-auto text-center space-y-8 py-16">
      {/* Spinner */}
      <div className="flex justify-center">
        <div className="w-12 h-12 rounded-full border-4 border-muted border-t-primary animate-spin" />
      </div>
      <div>
        <p className="text-muted-foreground text-sm truncate max-w-xs mx-auto">{url}</p>
        <h2 className="text-xl font-semibold mt-2">Scanning your site…</h2>
      </div>
      <div className="space-y-2 text-sm text-muted-foreground">
        {STAGE_MESSAGES.map((msg, i) => (
          <div
            key={msg}
            className={`transition-opacity ${i < stageIdx ? "opacity-40 line-through" : i === stageIdx ? "text-foreground font-medium opacity-100" : "opacity-30"}`}
          >
            {i < stageIdx ? "✓ " : i === stageIdx ? "→ " : "  "}
            {msg}
          </div>
        ))}
      </div>
    </div>
  );
}

function ResultState({ scan }: { scan: ScanRow }) {
  const score = scan.overall_score ?? 0;
  const categoryScores = scan.category_scores ?? {};
  const summary = scan.summary ?? {};
  const positives = summary.positives ?? [];
  const negatives = summary.negatives ?? [];
  const actions = summary.priority_actions ?? [];

  return (
    <div className="max-w-2xl mx-auto space-y-10 py-12 px-4">
      {/* Header */}
      <div className="text-center space-y-1">
        <p className="text-sm text-muted-foreground truncate">{scan.url}</p>
        <h1 className="text-2xl font-bold">Your AI Readiness Score</h1>
      </div>

      {/* Score gauge */}
      <div className="flex justify-center">
        <ScoreGauge score={score} />
      </div>

      {/* Category breakdown */}
      <div className="space-y-4">
        <h2 className="font-semibold text-base">Category Breakdown</h2>
        <div className="space-y-4">
          {CATEGORY_ORDER.map((cat) => {
            const s = categoryScores[cat];
            if (s == null) return null;
            return <CategoryBar key={cat} category={cat} score={s} />;
          })}
        </div>
      </div>

      {/* Positives */}
      {positives.length > 0 && (
        <div className="space-y-3">
          <h2 className="font-semibold text-base text-green-700">What&apos;s working well</h2>
          <ul className="space-y-2">
            {positives.slice(0, 3).map((p) => (
              <li key={p.key} className="flex items-start gap-2 text-sm">
                <span className="text-green-600 mt-0.5">✓</span>
                <span>{p.title ?? p.key}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Negatives */}
      {negatives.length > 0 && (
        <div className="space-y-3">
          <h2 className="font-semibold text-base text-red-700">Key gaps</h2>
          <ul className="space-y-2">
            {negatives.slice(0, 3).map((n) => (
              <li key={n.key} className="flex items-start gap-2 text-sm">
                <span className="text-red-500 mt-0.5">✗</span>
                <span>{n.title ?? n.key}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Priority actions */}
      {actions.length > 0 && (
        <div className="space-y-4">
          <h2 className="font-semibold text-base">Priority Actions</h2>
          <div className="space-y-4">
            {actions.map((action, i) => (
              <div key={action.key} className="rounded-lg border border-border p-4 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-muted-foreground bg-muted rounded-full w-5 h-5 flex items-center justify-center">
                      {i + 1}
                    </span>
                    <span className="font-medium text-sm">{action.title ?? action.key}</span>
                  </div>
                  {action.effort && (
                    <span className="text-xs text-muted-foreground capitalize shrink-0">
                      {action.effort} effort
                    </span>
                  )}
                </div>
                {action.howToFix && (
                  <p className="text-sm text-muted-foreground pl-7">{action.howToFix}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* CTA */}
      <div className="text-center pt-4">
        <Link
          href="/"
          className="inline-flex items-center justify-center h-10 px-5 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
        >
          Scan another site
        </Link>
      </div>
    </div>
  );
}

function ErrorState({ message, url }: { message: string | null; url?: string }) {
  return (
    <div className="max-w-lg mx-auto text-center space-y-6 py-16 px-4">
      <div className="text-4xl">⚠️</div>
      <div className="space-y-2">
        <h2 className="text-xl font-semibold">Scan failed</h2>
        {url && <p className="text-sm text-muted-foreground truncate">{url}</p>}
        <p className="text-sm text-muted-foreground">
          {message ?? "We were unable to complete this scan."}
        </p>
      </div>
      <Link
        href="/"
        className="inline-flex items-center justify-center h-10 px-5 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
      >
        Try a different site
      </Link>
    </div>
  );
}

export default function ScanPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;
  const [scan, setScan] = useState<ScanRow | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!id) return;

    async function poll() {
      try {
        const res = await fetch(`/api/scan/${id}`);
        if (res.status === 404) {
          setFetchError("Scan not found.");
          return;
        }
        if (!res.ok) {
          setFetchError("Error loading scan result.");
          return;
        }
        const data: ScanRow = await res.json();
        setScan(data);

        if (data.status === "queued" || data.status === "running") {
          pollRef.current = setTimeout(poll, 2000);
        }
      } catch {
        setFetchError("Network error loading scan.");
      }
    }

    void poll();

    return () => {
      if (pollRef.current) clearTimeout(pollRef.current);
    };
  }, [id, router]);

  if (fetchError) {
    return (
      <div className="min-h-screen flex flex-col font-[family-name:var(--font-geist-sans)]">
        <header className="px-6 py-4 border-b border-border">
          <Link href="/" className="font-semibold text-lg tracking-tight">PromptScore</Link>
        </header>
        <main className="flex-1">
          <ErrorState message={fetchError} />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col font-[family-name:var(--font-geist-sans)]">
      <header className="px-6 py-4 border-b border-border">
        <Link href="/" className="font-semibold text-lg tracking-tight">PromptScore</Link>
      </header>
      <main className="flex-1">
        {!scan || scan.status === "queued" || scan.status === "running" ? (
          <ProgressState url={scan?.url ?? ""} />
        ) : scan.status === "failed" ? (
          <ErrorState message={scan.error_message} url={scan.url} />
        ) : (
          <ResultState scan={scan} />
        )}
      </main>
    </div>
  );
}
