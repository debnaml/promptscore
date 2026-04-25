/**
 * Scan worker — runs in the background after a scan row is created.
 * Called fire-and-forget from POST /api/scan.
 *
 * Pipeline:
 *   1. Mark scan as 'running'
 *   2. buildFetchContext (full fetch pipeline)
 *   3. runChecks (deterministic + composite, skips A-type)
 *   4. aggregate (category + overall scores)
 *   5. Persist scan_checks rows
 *   6. Update scan row with scores and 'complete' status
 *   7. On any unhandled error → mark 'failed'
 */
import { buildFetchContext } from "@promptscore/fetch";
import { runChecks, aggregate, ALL_CHECKS } from "@promptscore/scoring";
import { supabaseAdmin } from "./supabase";

export async function runScanWorker(scanId: string, url: string): Promise<void> {
  // 1. Mark running
  await supabaseAdmin
    .from("scans")
    .update({ status: "running", started_at: new Date().toISOString() })
    .eq("id", scanId);

  try {
    // 2. Fetch context
    const ctx = await buildFetchContext(url);

    // 3. Run deterministic checks
    const runnerResults = await runChecks(ctx, ALL_CHECKS);

    // 4. Aggregate
    const agg = aggregate(runnerResults);

    // 5. Persist individual check rows
    const checkRows = runnerResults.map((r) => ({
      scan_id: scanId,
      category: r.category,
      check_key: r.key,
      score: r.result.not_scored ? null : Math.round(r.result.score * 100),
      weight: r.weight,
      evidence: r.result.evidence ?? null,
      notes: r.result.notes ?? null,
    }));

    if (checkRows.length > 0) {
      const { error: checkError } = await supabaseAdmin
        .from("scan_checks")
        .insert(checkRows);
      if (checkError) {
        console.error(`[scan:${scanId}] scan_checks insert error:`, checkError);
      }
    }

    // 6. Update scan with results
    const { error: updateError } = await supabaseAdmin
      .from("scans")
      .update({
        status: "complete",
        overall_score: agg.overall_score,
        category_scores: agg.category_scores,
        positives: agg.positives.map((r) => r.key),
        negatives: agg.negatives.map((r) => r.key),
        priority_actions: agg.priority_actions,
        completed_at: new Date().toISOString(),
      })
      .eq("id", scanId);

    if (updateError) {
      console.error(`[scan:${scanId}] scan update error:`, updateError);
    }
  } catch (err) {
    console.error(`[scan:${scanId}] worker error:`, err);
    await supabaseAdmin
      .from("scans")
      .update({
        status: "failed",
        completed_at: new Date().toISOString(),
      })
      .eq("id", scanId);
    // best-effort — ignore errors
  }
}
