import { NextRequest, NextResponse } from "next/server";
import { buildFetchContext } from "@promptscore/fetch";
import { runChecks, ALL_CHECKS } from "@promptscore/scoring";

// Middleware already enforces admin gate for /api/admin/*
export async function POST(request: NextRequest) {
  let body: { url?: string; checkKey?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { url, checkKey } = body;
  if (!url || !checkKey) {
    return NextResponse.json({ error: "url and checkKey are required" }, { status: 400 });
  }

  const check = ALL_CHECKS.find((c) => c.key === checkKey);
  if (!check) {
    return NextResponse.json({ error: `Unknown check key: ${checkKey}` }, { status: 400 });
  }

  const start = Date.now();
  try {
    const ctx = await buildFetchContext(url);
    const results = await runChecks(ctx, [check]);
    const r = results[0];
    return NextResponse.json({
      ok: true,
      checkKey,
      url,
      latencyMs: Date.now() - start,
      result: r
        ? {
            score: r.result.not_scored ? null : Math.round(r.result.score * 100),
            not_scored: r.result.not_scored ?? false,
            notes: r.result.notes ?? null,
            evidence: r.result.evidence ?? null,
          }
        : null,
    });
  } catch (e) {
    return NextResponse.json(
      { error: String(e), latencyMs: Date.now() - start },
      { status: 500 }
    );
  }
}
