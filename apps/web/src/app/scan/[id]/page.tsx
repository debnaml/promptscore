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

const CATEGORY_DESCRIPTIONS: Record<string, string> = {
  crawler_access:
    "Can AI bots actually reach and read your site? This checks robots.txt rules for ChatGPT, Perplexity, and Claude crawlers, your sitemap, HTTPS setup, whether content loads without JavaScript, and mobile page speed.",
  structured_data:
    "Does your site speak the machine-readable language AI uses to understand businesses? This covers schema.org markup (Organisation, FAQ, Breadcrumbs), Open Graph tags, and canonical URLs — the signals AI uses to describe you accurately.",
  content_clarity:
    "Would an AI confidently summarise what your business does from your website alone? This evaluates your homepage copy, heading structure, FAQ content, and whether your pages directly answer the questions people ask AI assistants.",
  ai_specific:
    "Have you taken the extra steps to signal AI-readiness? This checks for an llms.txt file (a machine-readable site summary), explicit training-bot policies, WAF firewall rules that might block AI crawlers, and an AI usage policy page.",
  authority_trust:
    "Does AI treat your site as a credible, authoritative source? This looks at your About page depth, contact information completeness, named author bylines, Wikidata presence, and whether you cite external sources — the signals that build AI trust.",
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
  const description = CATEGORY_DESCRIPTIONS[category];
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
      <div className="flex justify-between items-start gap-4">
        {description && (
          <p className="text-xs text-muted-foreground leading-relaxed">{description}</p>
        )}
        <span className="text-xs text-muted-foreground shrink-0">{weight}% of score</span>
      </div>
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
  const positives = (summary.positives ?? []) as Array<{ key: string; title?: string; explanation?: string }>;
  const negatives = (summary.negatives ?? []) as Array<{ key: string; title?: string; explanation?: string }>;
  const actions = (summary.priority_actions ?? []) as Array<{ key: string; title?: string; howToFix?: string; effort?: string }>;
  const band = (summary as { band?: { label?: string; description?: string } }).band;
  const headline = (summary as { headline?: string }).headline;

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

      {/* Band description */}
      {(band || headline) && (
        <div className="rounded-lg bg-muted/50 border border-border p-4 text-sm space-y-1">
          {band?.label && <p className="font-semibold">{band.label}</p>}
          <p className="text-muted-foreground">{headline ?? band?.description}</p>
        </div>
      )}

      {/* Category breakdown */}
      <div className="space-y-6">
        <h2 className="font-semibold text-base">Category Breakdown</h2>
        <div className="space-y-6">
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
          <h2 className="font-semibold text-base">What&apos;s working well</h2>
          <ul className="space-y-3">
            {positives.slice(0, 3).map((p) => (
              <li key={p.key} className="flex items-start gap-3 text-sm">
                <span className="text-green-600 mt-0.5 text-base leading-none">✓</span>
                <div>
                  <p className="font-medium">{p.title ?? p.key}</p>
                  {p.explanation && <p className="text-muted-foreground text-xs mt-0.5">{p.explanation}</p>}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Negatives */}
      {negatives.length > 0 && (
        <div className="space-y-3">
          <h2 className="font-semibold text-base">Key gaps</h2>
          <ul className="space-y-3">
            {negatives.slice(0, 3).map((n) => (
              <li key={n.key} className="flex items-start gap-3 text-sm">
                <span className="text-red-500 mt-0.5 text-base leading-none">✗</span>
                <div>
                  <p className="font-medium">{n.title ?? n.key}</p>
                  {n.explanation && <p className="text-muted-foreground text-xs mt-0.5">{n.explanation}</p>}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Priority actions */}
      {actions.length > 0 && (
        <div className="space-y-4">
          <h2 className="font-semibold text-base">Top Priority Actions</h2>
          <div className="space-y-4">
            {actions.map((action, i) => (
              <div key={action.key} className="rounded-lg border border-border p-4 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-muted-foreground bg-muted rounded-full w-5 h-5 flex items-center justify-center shrink-0">
                      {i + 1}
                    </span>
                    <span className="font-medium text-sm">{action.title ?? action.key}</span>
                  </div>
                  {action.effort && (
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full shrink-0 ${
                      action.effort === "small" ? "bg-green-100 text-green-700" :
                      action.effort === "medium" ? "bg-yellow-100 text-yellow-700" :
                      "bg-red-100 text-red-700"
                    }`}>
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

      {/* Full report CTA */}
      <div className="rounded-xl border-2 border-primary/20 bg-primary/5 p-6 text-center space-y-3">
        <h2 className="font-bold text-lg">Get your full report</h2>
        <p className="text-sm text-muted-foreground max-w-sm mx-auto">
          Enter your email to receive a detailed PDF report with every check explained, evidence snippets, and a step-by-step fix guide.
        </p>
        <Link
          href={`/scan/${scan.id}/unlock`}
          className="inline-flex items-center justify-center h-11 px-6 rounded-md bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity"
        >
          Get the full PDF report →
        </Link>
        <p className="text-xs text-muted-foreground">Free · No spam · Unsubscribe anytime</p>
      </div>

      {/* Scan another */}
      <div className="text-center">
        <Link
          href="/"
          className="text-sm text-muted-foreground hover:text-foreground underline underline-offset-4"
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
