import { NextRequest, NextResponse } from "next/server";
import JSZip from "jszip";
import { supabaseAdmin } from "@/lib/supabase";
import { CHECK_COPY } from "@promptscore/scoring";

type Positive = { key?: string; title?: string };
type Negative = { key?: string; title?: string };
type Priority = { key?: string; title?: string; howToFix?: string; effort?: string };

type ScanData = {
  overall_score?: number | null;
  category_scores?: Record<string, number> | null;
  detected_category?: string | null;
  summary?: {
    positives?: Array<string | Positive>;
    negatives?: Array<string | Negative>;
    priority_actions?: Array<string | Priority>;
    headline?: string;
  } | null;
  url?: string;
};

type Row = {
  url: string;
  label: string | null;
  hostname: string;
  scan: ScanData | null;
  status: string;
};

function hostnameOf(url: string): string {
  try { return new URL(url).hostname; } catch { return url; }
}

function strOrTitle(v: string | { title?: string } | undefined): string | null {
  if (!v) return null;
  if (typeof v === "string") return v;
  return v.title ?? null;
}

function escHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function monthYear(date: Date): string {
  return date.toLocaleString("en-GB", { month: "long", year: "numeric" });
}

function buildMarkdown(opts: {
  batchName: string;
  category: string;
  rows: Row[];
  avg: number;
  highest: Row;
  lowest: Row;
  mostCommonWeakness: string;
  publicMethodologyUrl: string;
  scannerUrl: string;
}): string {
  const { batchName, category, rows, avg, highest, lowest, mostCommonWeakness, publicMethodologyUrl, scannerUrl } = opts;
  const top = rows.slice(0, Math.min(10, rows.length));
  const top5 = rows.slice(0, Math.min(5, rows.length));
  const today = new Date();

  const lines: string[] = [];
  lines.push(`# Top ${top.length} ${category} websites, ranked by AI readiness — ${monthYear(today)}`);
  lines.push("");
  lines.push(`> _Lead paragraph — replace with editorial copy. Hook the reader with why AI readiness matters in ${category}._`);
  lines.push("");
  lines.push(`## Summary`);
  lines.push("");
  lines.push(`- Sites scored: **${rows.length}**`);
  lines.push(`- Average AI readiness score: **${avg}/100**`);
  lines.push(`- Highest: **${highest.label || highest.hostname} (${highest.scan?.overall_score})**`);
  lines.push(`- Lowest: **${lowest.label || lowest.hostname} (${lowest.scan?.overall_score})**`);
  if (mostCommonWeakness) {
    lines.push(`- Most common weakness: **${mostCommonWeakness}**`);
  }
  lines.push("");
  lines.push(`## The ranking`);
  lines.push("");
  lines.push(`| # | Site | Score | One-line take |`);
  lines.push(`|---|------|-------|---------------|`);
  top.forEach((r, i) => {
    const name = r.label || r.hostname;
    const score = r.scan?.overall_score ?? "—";
    const headline = (r.scan?.summary?.headline ?? "").replace(/\|/g, "\\|").replace(/\n/g, " ");
    lines.push(`| ${i + 1} | [${name}](${r.url}) | ${score} | ${headline} |`);
  });
  lines.push("");

  if (top5.length > 0) {
    lines.push(`## Top ${top5.length}: a closer look`);
    lines.push("");
    top5.forEach((r, i) => {
      const name = r.label || r.hostname;
      const score = r.scan?.overall_score ?? "—";
      lines.push(`### ${i + 1}. ${name} — ${score}/100`);
      lines.push("");
      const positives = (r.scan?.summary?.positives ?? []).slice(0, 2).map(strOrTitle).filter((x): x is string => !!x);
      const negatives = (r.scan?.summary?.negatives ?? []).slice(0, 2).map(strOrTitle).filter((x): x is string => !!x);
      if (positives.length > 0) {
        lines.push(`**What they're doing well**`);
        lines.push("");
        positives.forEach((p) => lines.push(`- ${p}`));
        lines.push("");
      }
      if (negatives.length > 0) {
        lines.push(`**What's holding them back**`);
        lines.push("");
        negatives.forEach((n) => lines.push(`- ${n}`));
        lines.push("");
      }
    });
  }

  lines.push(`## Methodology`);
  lines.push("");
  lines.push(`Scores are produced by the Performance Peak AI readiness scanner, a 34-check audit covering crawler access, structured data, content clarity, AI-specific signals, and authority/trust. Each site is scored on the same rubric. [Read the full methodology](${publicMethodologyUrl}).`);
  lines.push("");
  lines.push(`---`);
  lines.push("");
  lines.push(`**Want to know your own score?** [Run the scanner](${scannerUrl}) — takes about 90 seconds.`);
  lines.push("");
  lines.push(`<!-- Generated from benchmark "${batchName}" on ${today.toISOString().slice(0, 10)} -->`);
  lines.push("");
  return lines.join("\n");
}

function buildHtml(markdown: string, title: string): string {
  // Lightweight Markdown → HTML conversion (headings, lists, tables, links, bold, em).
  // The blog CMS will likely render Markdown directly; HTML is a fallback for paste-into-WordPress.
  const lines = markdown.split("\n");
  const out: string[] = [];
  let inTable = false;
  let inList = false;
  let inBlockquote = false;

  const flushList = () => {
    if (inList) {
      out.push("</ul>");
      inList = false;
    }
  };
  const flushTable = () => {
    if (inTable) {
      out.push("</tbody></table>");
      inTable = false;
    }
  };
  const flushQuote = () => {
    if (inBlockquote) {
      out.push("</blockquote>");
      inBlockquote = false;
    }
  };

  const inline = (s: string): string => {
    let r = escHtml(s);
    // links [text](url)
    r = r.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
    // bold **text**
    r = r.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
    // italics *text*
    r = r.replace(/(^|[^*])\*([^*]+)\*/g, "$1<em>$2</em>");
    return r;
  };

  for (const raw of lines) {
    const line = raw;

    // Tables
    if (/^\|.+\|$/.test(line)) {
      if (/^\|[\s|:-]+\|$/.test(line)) continue; // separator row
      const cells = line.slice(1, -1).split("|").map((c) => c.trim());
      if (!inTable) {
        flushList(); flushQuote();
        out.push('<table border="1" cellpadding="6" cellspacing="0" style="border-collapse:collapse"><thead><tr>');
        cells.forEach((c) => out.push(`<th>${inline(c)}</th>`));
        out.push("</tr></thead><tbody>");
        inTable = true;
      } else {
        out.push("<tr>");
        cells.forEach((c) => out.push(`<td>${inline(c)}</td>`));
        out.push("</tr>");
      }
      continue;
    }
    flushTable();

    if (line.startsWith("# ")) {
      flushList(); flushQuote();
      out.push(`<h1>${inline(line.slice(2))}</h1>`);
    } else if (line.startsWith("## ")) {
      flushList(); flushQuote();
      out.push(`<h2>${inline(line.slice(3))}</h2>`);
    } else if (line.startsWith("### ")) {
      flushList(); flushQuote();
      out.push(`<h3>${inline(line.slice(4))}</h3>`);
    } else if (line.startsWith("> ")) {
      flushList();
      if (!inBlockquote) { out.push("<blockquote>"); inBlockquote = true; }
      out.push(`<p>${inline(line.slice(2))}</p>`);
    } else if (line.startsWith("- ")) {
      flushQuote();
      if (!inList) { out.push("<ul>"); inList = true; }
      out.push(`<li>${inline(line.slice(2))}</li>`);
    } else if (line.trim() === "---") {
      flushList(); flushQuote();
      out.push("<hr>");
    } else if (line.startsWith("<!--") || line.trim() === "") {
      flushList(); flushQuote();
      if (line.trim() !== "") out.push(line);
    } else {
      flushList(); flushQuote();
      out.push(`<p>${inline(line)}</p>`);
    }
  }
  flushList();
  flushTable();
  flushQuote();

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>${escHtml(title)}</title>
<style>
  body { font: 16px/1.55 -apple-system, system-ui, sans-serif; max-width: 760px; margin: 2rem auto; padding: 0 1rem; color: #1e293b; }
  h1 { font-size: 1.9rem; margin-bottom: 0.25rem; }
  h2 { margin-top: 2rem; }
  h3 { margin-top: 1.5rem; }
  table { width: 100%; margin: 1rem 0; }
  th, td { padding: 0.5rem 0.75rem; }
  th { background: #f1f5f9; text-align: left; }
  blockquote { border-left: 3px solid #cbd5e1; padding-left: 1rem; color: #64748b; font-style: italic; }
  hr { border: 0; border-top: 1px solid #e2e8f0; margin: 2rem 0; }
  a { color: #2563eb; }
</style>
</head>
<body>
${out.join("\n")}
</body>
</html>`;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { data: batch } = await supabaseAdmin
    .from("bench_batches")
    .select("name")
    .eq("id", params.id)
    .single();

  if (!batch) {
    return NextResponse.json({ error: "Batch not found" }, { status: 404 });
  }

  const { data: results } = await supabaseAdmin
    .from("bench_results")
    .select("url, label, status, scans(overall_score, category_scores, detected_category, summary, url)")
    .eq("batch_id", params.id);

  const rawRows: Row[] = (results ?? [])
    .filter((r) => r.status === "complete" && r.scans)
    .map((r) => ({
      url: r.url,
      label: r.label,
      hostname: hostnameOf(r.url),
      scan: r.scans as ScanData,
      status: r.status,
    }));

  if (rawRows.length === 0) {
    return NextResponse.json(
      { error: "No completed scans in this batch yet" },
      { status: 400 }
    );
  }

  const sorted = rawRows.sort(
    (a, b) => (b.scan?.overall_score ?? -1) - (a.scan?.overall_score ?? -1)
  );

  const scores = sorted.map((r) => r.scan?.overall_score ?? 0);
  const avg = Math.round(scores.reduce((s, v) => s + v, 0) / scores.length);
  const highest = sorted[0];
  const lowest = sorted[sorted.length - 1];

  // Most common weakness: count check_keys appearing as a top-2 negative across rows
  const negCounts = new Map<string, number>();
  for (const r of sorted) {
    const negs = r.scan?.summary?.negatives ?? [];
    for (const n of negs.slice(0, 2)) {
      const key = typeof n === "object" && n !== null ? n.key ?? n.title ?? "" : n;
      if (key) negCounts.set(key, (negCounts.get(key) ?? 0) + 1);
    }
  }
  let mostCommonWeakness = "";
  if (negCounts.size > 0) {
    const entries = Array.from(negCounts.entries()).sort((a, b) => b[1] - a[1]);
    const topKey = entries[0][0];
    mostCommonWeakness = CHECK_COPY[topKey]?.title ?? topKey;
  }

  const category =
    sorted.find((r) => r.scan?.detected_category)?.scan?.detected_category ?? "site";

  // Use the public production URL for links in the export
  const publicBase = "https://promptscore.vercel.app";
  const publicMethodologyUrl = `${publicBase}/methodology`;
  const scannerUrl = publicBase;

  const markdown = buildMarkdown({
    batchName: batch.name,
    category,
    rows: sorted,
    avg,
    highest,
    lowest,
    mostCommonWeakness,
    publicMethodologyUrl,
    scannerUrl,
  });

  const title = `Top ${Math.min(10, sorted.length)} ${category} websites, ranked by AI readiness — ${monthYear(new Date())}`;
  const html = buildHtml(markdown, title);

  const safeName = batch.name.replace(/[^a-z0-9]/gi, "-").toLowerCase();
  const zip = new JSZip();
  zip.file(`${safeName}.md`, markdown);
  zip.file(`${safeName}.html`, html);
  const buffer = await zip.generateAsync({ type: "uint8array" });

  return new NextResponse(Buffer.from(buffer), {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${safeName}-blog.zip"`,
    },
  });
}
