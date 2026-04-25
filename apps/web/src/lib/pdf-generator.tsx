/**
 * PDF generator using @react-pdf/renderer.
 * Runs server-side only (Node.js environment).
 */
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  renderToBuffer,
  Font,
} from "@react-pdf/renderer";
import React from "react";
import { CHECK_COPY } from "@promptscore/scoring";

// Disable font hyphenation
Font.registerHyphenationCallback((w) => [w]);

const COLORS = {
  primary: "#0f172a",
  accent: "#6366f1",
  green: "#16a34a",
  yellow: "#ca8a04",
  orange: "#ea580c",
  red: "#dc2626",
  muted: "#6b7280",
  border: "#e5e7eb",
  bg: "#f9fafb",
  white: "#ffffff",
};

const CATEGORY_LABELS: Record<string, string> = {
  crawler_access: "Crawler Access",
  structured_data: "Structured Data",
  content_clarity: "Content Clarity",
  ai_specific: "AI-Specific Signals",
  authority_trust: "Authority & Trust",
};

const CATEGORY_DESCRIPTIONS: Record<string, string> = {
  crawler_access: "Can AI bots reach and read your site? Covers robots.txt, sitemap, HTTPS, JavaScript dependency, and mobile speed.",
  structured_data: "Machine-readable signals AI uses to understand your business: schema.org markup, Open Graph, and canonical URLs.",
  content_clarity: "Would an AI confidently summarise your business? Evaluates homepage copy, headings, FAQ content, and query coverage.",
  ai_specific: "Extra signals for AI-readiness: llms.txt, explicit bot policies, WAF configuration, and AI policy page.",
  authority_trust: "Credibility signals: About page depth, contact details, author bylines, Wikidata presence, and citation practice.",
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
  if (score >= 75) return COLORS.green;
  if (score >= 55) return COLORS.yellow;
  if (score >= 35) return COLORS.orange;
  return COLORS.red;
}

function getBandLabel(score: number): string {
  if (score >= 85) return "AI-Ready Leader";
  if (score >= 70) return "Solid Foundation";
  if (score >= 55) return "Partial Readiness";
  if (score >= 35) return "Significant Gaps";
  return "High Risk";
}

const s = StyleSheet.create({
  page: { fontFamily: "Helvetica", fontSize: 10, color: COLORS.primary, padding: 48, paddingBottom: 56 },
  footer: { position: "absolute", bottom: 24, left: 48, right: 48, flexDirection: "row", justifyContent: "space-between", fontSize: 8, color: COLORS.muted, borderTopWidth: 1, borderTopColor: COLORS.border, paddingTop: 6 },
  coverPage: { fontFamily: "Helvetica", padding: 48, backgroundColor: COLORS.primary },
  coverHeading: { fontSize: 32, color: COLORS.white, fontFamily: "Helvetica-Bold", marginBottom: 8 },
  coverSub: { fontSize: 14, color: "#a5b4fc", marginBottom: 48 },
  coverScoreBox: { backgroundColor: "#1e293b", borderRadius: 12, padding: 32, alignItems: "center", marginBottom: 32 },
  coverScore: { fontSize: 72, color: COLORS.white, fontFamily: "Helvetica-Bold", lineHeight: 1 },
  coverScoreLabel: { fontSize: 14, color: "#94a3b8", marginTop: 4 },
  coverBand: { fontSize: 18, color: COLORS.accent, fontFamily: "Helvetica-Bold", marginTop: 8 },
  coverUrl: { fontSize: 11, color: "#cbd5e1", marginBottom: 8 },
  coverDate: { fontSize: 10, color: "#64748b" },
  coverFooter: { position: "absolute", bottom: 24, left: 48, right: 48, flexDirection: "row", justifyContent: "space-between", fontSize: 9, color: "#475569" },
  h1: { fontSize: 20, fontFamily: "Helvetica-Bold", marginBottom: 16, color: COLORS.primary },
  h2: { fontSize: 14, fontFamily: "Helvetica-Bold", marginBottom: 8, color: COLORS.primary, marginTop: 16 },
  h3: { fontSize: 11, fontFamily: "Helvetica-Bold", marginBottom: 4, color: COLORS.primary },
  body: { fontSize: 10, color: COLORS.primary, lineHeight: 1.6, marginBottom: 8 },
  muted: { fontSize: 9, color: COLORS.muted, lineHeight: 1.5 },
  card: { borderWidth: 1, borderColor: COLORS.border, borderRadius: 6, padding: 12, marginBottom: 8 },
  row: { flexDirection: "row", alignItems: "center", gap: 8 },
  badge: { borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2, fontSize: 8, fontFamily: "Helvetica-Bold" },
  barBg: { height: 6, backgroundColor: "#e5e7eb", borderRadius: 3, marginTop: 4, marginBottom: 4 },
  separator: { borderTopWidth: 1, borderTopColor: COLORS.border, marginVertical: 12 },
  bullet: { flexDirection: "row", gap: 6, marginBottom: 4 },
});

function Footer({ domain, date, page }: { domain: string; date: string; page: number }) {
  return (
    <View style={s.footer} fixed>
      <Text>PromptScore by Performance Peak · {date} · promptscore.co.uk</Text>
      <Text>{domain}</Text>
      <Text>Page {page}</Text>
    </View>
  );
}

interface ScanCheck {
  check_key: string;
  category: string;
  score: number | null;
  weight: number | null;
  evidence: Record<string, unknown> | null;
  notes: string | null;
}

interface ScanData {
  url: string;
  overall_score: number | null;
  category_scores: Record<string, number> | null;
  summary: Record<string, unknown> | null;
  created_at: string;
}

function CoverPage({ scan, date }: { scan: ScanData; domain: string; date: string }) {
  const score = scan.overall_score ?? 0;
  return (
    <Page size="A4" style={s.coverPage}>
      <Text style={s.coverHeading}>PromptScore</Text>
      <Text style={s.coverSub}>AI Readiness Report · a Performance Peak product</Text>

      <View style={s.coverScoreBox}>
        <Text style={s.coverScore}>{score}</Text>
        <Text style={s.coverScoreLabel}>out of 100</Text>
        <Text style={s.coverBand}>{getBandLabel(score)}</Text>
      </View>

      <Text style={s.coverUrl}>{scan.url}</Text>
      <Text style={s.coverDate}>Generated {date}</Text>

      <View style={s.coverFooter}>
        <Text>PromptScore by Performance Peak</Text>
        <Text>promptscore.co.uk</Text>
      </View>
    </Page>
  );
}

function ExecutiveSummaryPage({ scan, domain, date }: { scan: ScanData; domain: string; date: string }) {
  const score = scan.overall_score ?? 0;
  const summary = scan.summary ?? {};
  const headline = (summary as { headline?: string }).headline ?? "";
  const band = (summary as { band?: { label?: string; description?: string } }).band;
  const positives = ((summary as { positives?: Array<{ title?: string; explanation?: string }> }).positives ?? []).slice(0, 3);
  const priorities = ((summary as { priority_actions?: Array<{ title?: string; howToFix?: string; effort?: string }> }).priority_actions ?? []).slice(0, 3);

  return (
    <Page size="A4" style={s.page}>
      <Text style={s.h1}>Executive Summary</Text>
      <Text style={[s.body, { color: COLORS.muted, marginBottom: 4 }]}>{domain}</Text>

      <View style={[s.card, { backgroundColor: COLORS.bg }]}>
        <View style={s.row}>
          <Text style={{ fontSize: 36, fontFamily: "Helvetica-Bold", color: scoreColor(score) }}>{score}</Text>
          <View>
            <Text style={{ fontSize: 10, color: COLORS.muted }}> / 100</Text>
            <Text style={{ fontFamily: "Helvetica-Bold", fontSize: 12, color: scoreColor(score) }}>{band?.label ?? getBandLabel(score)}</Text>
          </View>
        </View>
        {headline ? <Text style={[s.body, { marginTop: 8 }]}>{headline}</Text> : null}
      </View>

      {positives.length > 0 && (
        <>
          <Text style={s.h2}>What&apos;s working well</Text>
          {positives.map((p, i) => (
            <View key={i} style={s.bullet}>
              <Text style={{ color: COLORS.green, fontSize: 11 }}>✓</Text>
              <View style={{ flex: 1 }}>
                <Text style={s.h3}>{p.title}</Text>
                {p.explanation ? <Text style={s.muted}>{p.explanation}</Text> : null}
              </View>
            </View>
          ))}
        </>
      )}

      {priorities.length > 0 && (
        <>
          <Text style={s.h2}>Top 3 Priority Actions</Text>
          {priorities.map((a, i) => (
            <View key={i} style={[s.card, { marginBottom: 6 }]}>
              <Text style={s.h3}>{i + 1}. {a.title}</Text>
              {a.howToFix ? <Text style={s.muted}>{a.howToFix}</Text> : null}
            </View>
          ))}
        </>
      )}

      <Footer domain={domain} date={date} page={2} />
    </Page>
  );
}

function CategoryPage({
  category,
  score,
  checks,
  domain,
  date,
  pageNum,
}: {
  category: string;
  score: number;
  checks: ScanCheck[];
  domain: string;
  date: string;
  pageNum: number;
}) {
  const label = CATEGORY_LABELS[category] ?? category;
  const description = CATEGORY_DESCRIPTIONS[category] ?? "";
  const weight = CATEGORY_WEIGHTS[category] ?? 0;
  const catChecks = checks.filter((c) => c.category === category);

  return (
    <Page size="A4" style={s.page}>
      <Text style={s.h1}>{label}</Text>
      <Text style={s.muted}>{weight}% of overall score</Text>

      {/* Score bar */}
      <View style={{ marginVertical: 8 }}>
        <View style={s.row}>
          <Text style={{ fontFamily: "Helvetica-Bold", fontSize: 18, color: scoreColor(score) }}>{score}/100</Text>
          <Text style={[s.muted, { marginLeft: 8 }]}>{getBandLabel(score)}</Text>
        </View>
        <View style={s.barBg}>
          <View style={{ height: 6, backgroundColor: scoreColor(score), borderRadius: 3, width: `${score}%` }} />
        </View>
      </View>

      <Text style={[s.body, { marginBottom: 12 }]}>{description}</Text>
      <View style={s.separator} />

      {/* Individual checks */}
      {catChecks.map((chk, i) => {
        const rawScore = chk.score; // 0–100 stored
        const copy = CHECK_COPY[chk.check_key];
        const notScored = rawScore == null;
        const passed = !notScored && rawScore >= 80;
        const partial = !notScored && rawScore >= 40 && rawScore < 80;

        return (
          <View key={i} style={[s.card, { marginBottom: 6 }]}>
            <View style={s.row}>
              <Text style={{ fontSize: 12, color: passed ? COLORS.green : partial ? COLORS.yellow : notScored ? COLORS.muted : COLORS.red }}>
                {notScored ? "—" : passed ? "✓" : partial ? "!" : "✗"}
              </Text>
              <Text style={[s.h3, { flex: 1 }]}>{copy?.title ?? chk.check_key}</Text>
              {!notScored && (
                <Text style={[s.badge, { backgroundColor: passed ? "#dcfce7" : partial ? "#fef9c3" : "#fee2e2", color: passed ? COLORS.green : partial ? COLORS.yellow : COLORS.red }]}>
                  {rawScore}/100
                </Text>
              )}
            </View>
            {chk.notes && <Text style={s.muted}>{chk.notes}</Text>}
            {!passed && !notScored && copy?.howToFix && (
              <Text style={[s.muted, { marginTop: 4, color: COLORS.primary }]}>
                Fix: {copy.howToFix}
              </Text>
            )}
          </View>
        );
      })}

      <Footer domain={domain} date={date} page={pageNum} />
    </Page>
  );
}

function PriorityActionsPage({
  scan,
  domain,
  date,
}: {
  scan: ScanData;
  domain: string;
  date: string;
}) {
  const summary = scan.summary ?? {};
  const actions = ((summary as { priority_actions?: Array<{ key?: string; title?: string; howToFix?: string; effort?: string }> }).priority_actions ?? []).slice(0, 5);

  return (
    <Page size="A4" style={s.page}>
      <Text style={s.h1}>Priority Actions</Text>
      <Text style={[s.body, { marginBottom: 16 }]}>
        These are the highest-impact fixes, ranked by potential score improvement divided by implementation effort.
      </Text>

      {actions.map((action, i) => {
        const effortColor = action.effort === "small" ? COLORS.green : action.effort === "medium" ? COLORS.yellow : COLORS.orange;
        return (
          <View key={i} style={[s.card, { marginBottom: 10 }]}>
            <View style={[s.row, { marginBottom: 4 }]}>
              <Text style={{ fontFamily: "Helvetica-Bold", fontSize: 14, color: COLORS.accent }}>{i + 1}</Text>
              <Text style={[s.h3, { flex: 1 }]}>{action.title ?? action.key}</Text>
              {action.effort && (
                <View style={[s.badge, { backgroundColor: "#f3f4f6" }]}>
                  <Text style={{ color: effortColor, fontSize: 8, fontFamily: "Helvetica-Bold" }}>{action.effort} effort</Text>
                </View>
              )}
            </View>
            {action.howToFix && <Text style={s.body}>{action.howToFix}</Text>}
          </View>
        );
      })}

      <Footer domain={domain} date={date} page={8} />
    </Page>
  );
}

function MethodologyPage({ domain, date }: { domain: string; date: string }) {
  return (
    <Page size="A4" style={s.page}>
      <Text style={s.h1}>Methodology</Text>

      <Text style={s.h2}>How PromptScore works</Text>
      <Text style={s.body}>
        PromptScore runs 34 checks across 5 categories, each weighted by its importance to AI search visibility. Checks are a combination of deterministic analysis (parsing robots.txt, schema markup, HTML structure) and AI-graded rubrics using Claude models for subjective judgements like content clarity and citation quality.
      </Text>

      <Text style={s.h2}>Scoring</Text>
      <Text style={s.body}>
        Each check returns a score between 0 and 1, multiplied by its weight within its category. Category scores are then combined using fixed category weights (Crawler Access 20%, Structured Data 25%, Content Clarity 25%, AI-Specific Signals 15%, Authority &amp; Trust 15%) to produce the 0–100 overall score.
      </Text>

      <Text style={s.h2}>Score bands</Text>
      {[
        ["85–100", "AI-Ready Leader", "Well-optimised for AI search discovery"],
        ["70–84", "Solid Foundation", "Strong fundamentals with a few targeted improvements needed"],
        ["55–69", "Partial Readiness", "Meaningful progress but significant gaps remain"],
        ["35–54", "Significant Gaps", "Multiple fundamental issues limiting AI visibility"],
        ["0–34", "High Risk", "Critical barriers preventing AI systems from finding your content"],
      ].map(([range, band, desc]) => (
        <View key={range} style={[s.bullet, { marginBottom: 4 }]}>
          <Text style={{ fontFamily: "Helvetica-Bold", width: 60, fontSize: 9 }}>{range}</Text>
          <Text style={{ fontFamily: "Helvetica-Bold", width: 110, fontSize: 9 }}>{band}</Text>
          <Text style={[s.muted, { flex: 1 }]}>{desc}</Text>
        </View>
      ))}

      <Text style={s.h2}>About PromptScore</Text>
      <Text style={s.body}>
        PromptScore is a product by Performance Peak, a specialist AI search optimisation consultancy. For help implementing these recommendations, visit performancepeak.co.uk.
      </Text>

      <Footer domain={domain} date={date} page={9} />
    </Page>
  );
}

export async function renderReportPDF(input: { scan: ScanData; checks: ScanCheck[] }): Promise<Buffer> {
  const { scan, checks } = input;
  const domain = (() => {
    try { return new URL(scan.url).hostname; } catch { return scan.url; }
  })();
  const date = new Date(scan.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
  const categoryScores = scan.category_scores ?? {};

  const doc = React.createElement(Document, { title: `PromptScore Report — ${domain}`, author: "PromptScore" },
    React.createElement(CoverPage, { scan, domain, date }),
    React.createElement(ExecutiveSummaryPage, { scan, domain, date }),
    ...CATEGORY_ORDER.map((cat, i) =>
      React.createElement(CategoryPage, {
        key: cat,
        category: cat,
        score: categoryScores[cat] ?? 0,
        checks,
        domain,
        date,
        pageNum: i + 3,
      })
    ),
    React.createElement(PriorityActionsPage, { scan, domain, date }),
    React.createElement(MethodologyPage, { domain, date })
  );

  return Buffer.from(await renderToBuffer(doc));
}
