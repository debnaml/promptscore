import { NextRequest, NextResponse } from "next/server";
import { Receiver } from "@upstash/qstash";
import { createHash } from "crypto";
import { Resend } from "resend";
import { supabaseAdmin } from "@/lib/supabase";
import { qstash } from "@/lib/qstash";
import { runScanWorker } from "@/lib/scan-worker";

export const maxDuration = 300;

const receiver = new Receiver({
  currentSigningKey: process.env.QSTASH_CURRENT_SIGNING_KEY ?? "dev",
  nextSigningKey:    process.env.QSTASH_NEXT_SIGNING_KEY    ?? "dev",
});

export async function POST(request: NextRequest) {
  const rawBody = await request.text();

  // Verify QStash signature (skip in local dev when keys are not configured)
  if (process.env.QSTASH_CURRENT_SIGNING_KEY) {
    const sig = request.headers.get("upstash-signature") ?? "";
    const host = request.headers.get("host") ?? "";
    const proto = host.startsWith("localhost") ? "http" : "https";
    try {
      await receiver.verify({
        signature: sig,
        body: rawBody,
        url: `${proto}://${host}/api/admin/benchmarks/worker`,
      });
    } catch {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }
  }

  const { batchId, resultId } = JSON.parse(rawBody) as { batchId: string; resultId: string };

  // Mark result + batch as running
  await supabaseAdmin
    .from("bench_results")
    .update({ status: "running" })
    .eq("id", resultId);

  await supabaseAdmin
    .from("bench_batches")
    .update({ status: "running" })
    .eq("id", batchId)
    .eq("status", "pending"); // only flip if still pending

  // Fetch the URL for this result
  const { data: resultRow } = await supabaseAdmin
    .from("bench_results")
    .select("url")
    .eq("id", resultId)
    .single();

  if (!resultRow) {
    return NextResponse.json({ error: "Result not found" }, { status: 404 });
  }

  let scanSucceeded = false;
  try {
    const canonical = new URL(resultRow.url);
    const urlHash = createHash("sha256").update(canonical.href).digest("hex");

    const { data: scanRow, error: insertErr } = await supabaseAdmin
      .from("scans")
      .insert({ url: canonical.href, url_hash: urlHash, status: "queued" })
      .select("id")
      .single();

    if (insertErr || !scanRow) throw new Error("Failed to create scan row");

    // Link scan to bench_result immediately so UI can show progress
    await supabaseAdmin
      .from("bench_results")
      .update({ scan_id: scanRow.id })
      .eq("id", resultId);

    await runScanWorker(scanRow.id, canonical.href);
    scanSucceeded = true;

    await supabaseAdmin
      .from("bench_results")
      .update({ status: "complete", completed_at: new Date().toISOString() })
      .eq("id", resultId);

    // Increment completed count (sequential — no race)
    const { data: b } = await supabaseAdmin
      .from("bench_batches")
      .select("completed_urls")
      .eq("id", batchId)
      .single();
    await supabaseAdmin
      .from("bench_batches")
      .update({ completed_urls: (b?.completed_urls ?? 0) + 1 })
      .eq("id", batchId);

  } catch (err) {
    console.error(`[bench:${batchId}] scan error for result ${resultId}:`, err);
    await supabaseAdmin
      .from("bench_results")
      .update({ status: "failed", error: String(err) })
      .eq("id", resultId);

    const { data: b } = await supabaseAdmin
      .from("bench_batches")
      .select("failed_urls")
      .eq("id", batchId)
      .single();
    await supabaseAdmin
      .from("bench_batches")
      .update({ failed_urls: (b?.failed_urls ?? 0) + 1 })
      .eq("id", batchId);
  }

  // Find next pending result
  const { data: batch } = await supabaseAdmin
    .from("bench_batches")
    .select("name, delay_seconds, total_urls, completed_urls, failed_urls")
    .eq("id", batchId)
    .single();

  const { data: nextResult } = await supabaseAdmin
    .from("bench_results")
    .select("id")
    .eq("batch_id", batchId)
    .eq("status", "pending")
    .order("position", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (nextResult) {
    // Queue next URL with configured delay
    const host = request.headers.get("host") ?? "";
    const proto = host.startsWith("localhost") ? "http" : "https";
    const workerUrl = `${proto}://${host}/api/admin/benchmarks/worker`;
    const payload = JSON.stringify({ batchId, resultId: nextResult.id });

    if (process.env.QSTASH_TOKEN) {
      await qstash.publish({
        url: workerUrl,
        body: payload,
        headers: { "Content-Type": "application/json" },
        delay: batch?.delay_seconds ?? 30,
      });
    } else {
      // Local dev: call directly (no delay)
      await fetch(workerUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: payload,
      });
    }
  } else {
    // All results processed — mark batch complete
    await supabaseAdmin
      .from("bench_batches")
      .update({ status: "complete", completed_at: new Date().toISOString() })
      .eq("id", batchId);

    // Completion email
    if (process.env.RESEND_API_KEY && process.env.ADMIN_EMAIL && batch) {
      const resend = new Resend(process.env.RESEND_API_KEY);
      const host = request.headers.get("host") ?? "";
      const proto = host.startsWith("localhost") ? "http" : "https";
      await resend.emails.send({
        from: process.env.FROM_EMAIL ?? "noreply@example.com",
        to: process.env.ADMIN_EMAIL,
        subject: `Benchmark complete: "${batch.name}"`,
        html: `<p>Your benchmark <strong>${batch.name}</strong> has finished (${batch.total_urls} URLs).</p><p><a href="${proto}://${host}/admin/benchmarks/${batchId}">View results →</a></p>`,
      });
    }
  }

  void scanSucceeded; // used implicitly via flow
  return NextResponse.json({ ok: true });
}
