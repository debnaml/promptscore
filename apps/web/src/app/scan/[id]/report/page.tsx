import { notFound } from "next/navigation";
import Link from "next/link";
import { supabaseAdmin } from "@/lib/supabase";
import { CHECK_COPY } from "@promptscore/scoring";

const CATEGORY_ORDER = ["crawler_access", "structured_data", "content_clarity", "ai_specific", "authority_trust"];
const CATEGORY_LABELS: Record<string, string> = {
  crawler_access: "Crawler Access",
  structured_data: "Structured Data",
  content_clarity: "Content Clarity",
  ai_specific: "AI-Specific Signals",
  authority_trust: "Authority & Trust",
};
const CATEGORY_WEIGHTS: Record<string, number> = {
  crawler_access: 20, structured_data: 25, content_clarity: 25, ai_specific: 15, authority_trust: 15,
};

function scoreColor(score: number) {
  if (score >= 75) return "text-green-600";
  if (score >= 55) return "text-yellow-600";
  if (score >= 35) return "text-orange-500";
  return "text-red-600";
}
function scoreBg(score: number) {
  if (score >= 75) return "bg-green-500";
  if (score >= 55) return "bg-yellow-500";
  if (score >= 35) return "bg-orange-500";
  return "bg-red-500";
}
function checkIcon(score: number | null) {
  if (score == null) return { icon: "—", cls: "text-muted-foreground" };
  if (score >= 80) return { icon: "✓", cls: "text-green-600" };
  if (score >= 40) return { icon: "!", cls: "text-yellow-600" };
  return { icon: "✗", cls: "text-red-600" };
}

export default async function ReportPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { token?: string };
}) {
  const { id } = params;
  const token = searchParams?.token;

  // Validate token against leads table
  if (!token) return notFound();

  const { data: lead } = await supabaseAdmin
    .from("leads")
    .select("id, scan_id, name")
    .eq("unlock_token", token)
    .eq("scan_id", id)
    .single();

  if (!lead) return notFound();

  const [{ data: scan }, { data: checks }] = await Promise.all([
    supabaseAdmin.from("scans").select("*").eq("id", id).single(),
    supabaseAdmin.from("scan_checks").select("*").eq("scan_id", id).order("category"),
  ]);

  if (!scan) return notFound();

  const categoryScores = (scan.category_scores ?? {}) as Record<string, number>;
  const summary = (scan.summary ?? {}) as Record<string, unknown>;
  const score = scan.overall_score ?? 0;
  const headline = (summary as { headline?: string }).headline;
  const band = (summary as { band?: { label?: string } }).band;
  const domain = (() => { try { return new URL(scan.url).hostname; } catch { return scan.url; } })();
  const priorityActions = ((summary as { priority_actions?: Array<{ key?: string; title?: string; howToFix?: string; effort?: string }> }).priority_actions ?? []);

  const checksByCategory = CATEGORY_ORDER.reduce<Record<string, typeof checks>>((acc, cat) => {
    acc[cat] = (checks ?? []).filter((c) => c.category === cat);
    return acc;
  }, {});

  return (
    <div className="min-h-screen flex flex-col font-[family-name:var(--font-geist-sans)]">
      <header className="px-6 py-4 border-b border-border sticky top-0 bg-background/95 backdrop-blur z-10">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <Link href="/" className="font-semibold text-lg tracking-tight">PromptScore</Link>
          <span className="text-sm text-muted-foreground truncate max-w-xs hidden sm:block">{domain}</span>
        </div>
      </header>

      <main className="flex-1 max-w-3xl mx-auto w-full px-4 py-12 space-y-16">
        {/* Hero */}
        <div className="text-center space-y-3">
          <p className="text-sm text-muted-foreground">{scan.url}</p>
          <h1 className="text-3xl font-bold">Full AI Readiness Report</h1>
          <div className="flex items-center justify-center gap-3">
            <span className={`text-5xl font-bold ${scoreColor(score)}`}>{score}</span>
            <span className="text-muted-foreground text-xl">/100</span>
          </div>
          {band?.label && <p className={`font-semibold ${scoreColor(score)}`}>{band.label}</p>}
          {headline && <p className="text-muted-foreground text-sm max-w-lg mx-auto">{headline}</p>}
        </div>

        {/* Category overview */}
        <div className="space-y-6">
          <h2 className="text-xl font-bold">Category Scores</h2>
          <div className="space-y-5">
            {CATEGORY_ORDER.map((cat) => {
              const s = categoryScores[cat] ?? 0;
              return (
                <div key={cat} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <a href={`#cat-${cat}`} className="font-medium hover:underline">{CATEGORY_LABELS[cat]}</a>
                    <span className={`font-semibold ${scoreColor(s)}`}>{s}/100</span>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div className={`h-full rounded-full ${scoreBg(s)}`} style={{ width: `${s}%` }} />
                  </div>
                  <p className="text-xs text-muted-foreground">{CATEGORY_WEIGHTS[cat]}% of overall score</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Priority actions */}
        {priorityActions.length > 0 && (
          <div className="space-y-5" id="priority-actions">
            <h2 className="text-xl font-bold">Priority Actions</h2>
            <div className="space-y-4">
              {priorityActions.map((action, i) => (
                <div key={action.key ?? i} className="rounded-lg border border-border p-5 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-bold text-muted-foreground bg-muted rounded-full w-6 h-6 flex items-center justify-center shrink-0">{i + 1}</span>
                      <span className="font-semibold text-sm">{action.title ?? action.key}</span>
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
                  {action.howToFix && <p className="text-sm text-muted-foreground pl-9">{action.howToFix}</p>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Per-category deep dives */}
        {CATEGORY_ORDER.map((cat) => {
          const catScore = categoryScores[cat] ?? 0;
          const catChecks = checksByCategory[cat] ?? [];
          return (
            <div key={cat} id={`cat-${cat}`} className="space-y-5">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold">{CATEGORY_LABELS[cat]}</h2>
                <span className={`text-lg font-bold ${scoreColor(catScore)}`}>{catScore}/100</span>
              </div>
              <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                <div className={`h-full rounded-full ${scoreBg(catScore)}`} style={{ width: `${catScore}%` }} />
              </div>

              <div className="space-y-3">
                {catChecks.map((chk) => {
                  const rawScore = chk.score as number | null;
                  const { icon, cls } = checkIcon(rawScore);
                  const copy = CHECK_COPY[chk.check_key as string];
                  const passed = rawScore != null && rawScore >= 80;

                  return (
                    <div key={chk.check_key as string} className={`rounded-lg border p-4 space-y-2 ${passed ? "border-green-200 bg-green-50/30" : rawScore == null ? "border-border bg-muted/20" : rawScore >= 40 ? "border-yellow-200 bg-yellow-50/30" : "border-red-200 bg-red-50/30"}`}>
                      <div className="flex items-start gap-3">
                        <span className={`${cls} text-base font-bold mt-0.5 shrink-0 w-4`}>{icon}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <p className="font-medium text-sm">{copy?.title ?? chk.check_key as string}</p>
                            {rawScore != null && (
                              <span className={`text-xs font-semibold shrink-0 ${cls}`}>{rawScore}/100</span>
                            )}
                          </div>
                          {rawScore == null && (
                            <p className="text-xs text-muted-foreground mt-0.5">Not scored (data unavailable)</p>
                          )}
                          {chk.notes && (
                            <p className="text-xs text-muted-foreground mt-1 italic">{chk.notes as string}</p>
                          )}
                          {!passed && rawScore != null && copy?.howToFix && (
                            <div className="mt-2 rounded-md bg-background border border-border p-3">
                              <p className="text-xs font-semibold mb-1 text-muted-foreground uppercase tracking-wide">How to fix</p>
                              <p className="text-xs text-foreground leading-relaxed">{copy.howToFix}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}

        {/* Footer CTA */}
        <div className="rounded-xl border border-border bg-muted/30 p-8 text-center space-y-4">
          <h2 className="font-bold text-lg">Need help implementing these fixes?</h2>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto">
            Performance Peak specialises in AI search optimisation. Get in touch to discuss your results.
          </p>
          <a
            href="mailto:lee@performancepeak.co.uk"
            className="inline-flex items-center justify-center h-10 px-5 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
          >
            Contact Performance Peak
          </a>
        </div>

        <div className="text-center">
          <Link href="/" className="text-sm text-muted-foreground hover:text-foreground underline underline-offset-4">
            Scan another site
          </Link>
        </div>
      </main>

      <footer className="px-6 py-6 border-t border-border text-center text-xs text-muted-foreground">
        PromptScore by Performance Peak · <Link href="/privacy" className="underline underline-offset-2">Privacy policy</Link>
      </footer>
    </div>
  );
}
