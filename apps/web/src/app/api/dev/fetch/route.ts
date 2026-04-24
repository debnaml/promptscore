import { NextRequest, NextResponse } from "next/server";
import { canonicalise, fetchRobots, fetchSitemap, fetchLlmsTxt, fetchStatic } from "@promptscore/fetch";

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json();
    if (!url || typeof url !== "string") {
      return NextResponse.json({ error: "url required" }, { status: 400 });
    }

    let canonical: ReturnType<typeof canonicalise>;
    try {
      canonical = canonicalise(url.trim());
    } catch (e) {
      return NextResponse.json(
        { error: e instanceof Error ? e.message : "Invalid URL" },
        { status: 400 }
      );
    }

    const [robotsResult, sitemapResult, llmsResult, staticResult] = await Promise.all([
      fetchRobots(canonical.canonical),
      fetchSitemap(canonical.canonical),
      fetchLlmsTxt(canonical.canonical),
      fetchStatic(canonical.canonical),
    ]);

    return NextResponse.json({
      canonical: canonical.canonical,
      urlHash: canonical.urlHash,
      robots: {
        present: robotsResult.present,
        status: robotsResult.status,
        userAgents: robotsResult.analysis.listedUserAgents(),
        sitemapUrls: robotsResult.analysis.sitemapUrls(),
        gptBotAllowed: robotsResult.analysis.isAllowed("GPTBot", "/"),
        claudeBotAllowed: robotsResult.analysis.isAllowed("ClaudeBot", "/"),
        googlebotAllowed: robotsResult.analysis.isAllowed("Googlebot", "/"),
        hasExplicitGptBot: robotsResult.analysis.hasExplicitRuleFor("GPTBot"),
        raw: robotsResult.raw,
      },
      sitemap: {
        present: sitemapResult.analysis.present,
        sourceUrl: sitemapResult.analysis.sourceUrl,
        totalUrls: sitemapResult.analysis.entries.length,
        sample: sitemapResult.analysis.entries.slice(0, 10),
        errors: sitemapResult.analysis.errors,
      },
      llmsTxt: {
        present: llmsResult.analysis.present,
        valid: llmsResult.analysis.valid,
        hasFullVersion: llmsResult.analysis.fullRaw !== null,
        errors: llmsResult.analysis.errors,
        raw: llmsResult.analysis.raw,
      },
      staticHtml: staticResult.ok
        ? {
            ok: true,
            status: staticResult.status,
            redirectChain: staticResult.redirectChain,
            htmlLength: staticResult.html.length,
            contentType: staticResult.headers["content-type"] ?? null,
            snippet: staticResult.html.slice(0, 500),
          }
        : {
            ok: false,
            kind: staticResult.kind,
            status: staticResult.status,
            message: staticResult.message,
            redirectChain: staticResult.redirectChain,
          },
    });
  } catch (err) {
    console.error("dev/fetch error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
