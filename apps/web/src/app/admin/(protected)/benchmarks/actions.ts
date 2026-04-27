"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient, isAdminEmail } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase";
import { qstash } from "@/lib/qstash";

async function requireAdmin(): Promise<string> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !isAdminEmail(user.email)) throw new Error("Unauthorized");
  return user.email!;
}

function normalizeUrl(raw: string): string {
  const t = raw.trim();
  return t.startsWith("http://") || t.startsWith("https://") ? t : `https://${t}`;
}

function parseEntries(raw: string): Array<{ url: string; label: string | null }> {
  return raw
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .map((line) => {
      const comma = line.indexOf(",");
      if (comma > -1) {
        const url = normalizeUrl(line.slice(0, comma));
        const label = line.slice(comma + 1).trim() || null;
        return { url, label };
      }
      return { url: normalizeUrl(line), label: null };
    });
}

export async function createBatchAction(formData: FormData) {
  const adminEmail = await requireAdmin();

  const name = (formData.get("name") as string)?.trim();
  const urlsRaw = formData.get("urls") as string;
  const delaySeconds = Math.max(10, Number(formData.get("delay_seconds") ?? 30));

  if (!name) throw new Error("Name is required");

  const entries = parseEntries(urlsRaw ?? "");
  if (entries.length === 0) throw new Error("No valid URLs provided");
  if (entries.length > 100) throw new Error("Maximum 100 URLs per batch");

  // Validate all URLs
  for (const e of entries) {
    try { new URL(e.url); } catch {
      throw new Error(`Invalid URL: ${e.url}`);
    }
  }

  // Create batch row
  const { data: batch, error: batchErr } = await supabaseAdmin
    .from("bench_batches")
    .insert({
      name,
      total_urls: entries.length,
      delay_seconds: delaySeconds,
      created_by: adminEmail,
    })
    .select("id")
    .single();

  if (batchErr || !batch) throw new Error("Failed to create batch");

  // Create result rows
  const resultRows = entries.map((e, i) => ({
    batch_id: batch.id,
    url: e.url,
    label: e.label,
    position: i + 1,
  }));

  const { error: resErr } = await supabaseAdmin
    .from("bench_results")
    .insert(resultRows);

  if (resErr) throw new Error("Failed to create result rows");

  // Fetch first result by position to kick off the queue
  const { data: results } = await supabaseAdmin
    .from("bench_results")
    .select("id")
    .eq("batch_id", batch.id)
    .order("position", { ascending: true })
    .limit(1);

  if (!results?.length) throw new Error("No results found after insert");

  // Enqueue first URL
  const headersList = await headers();
  const host = headersList.get("host") ?? "localhost:3000";
  const proto = host.startsWith("localhost") ? "http" : "https";
  const workerUrl = `${proto}://${host}/api/admin/benchmarks/worker`;
  const payload = JSON.stringify({ batchId: batch.id, resultId: results[0].id });

  if (process.env.QSTASH_TOKEN) {
    await qstash.publish({
      url: workerUrl,
      body: payload,
      headers: { "Content-Type": "application/json" },
    });
  } else {
    // Local dev: fire-and-forget without QStash
    fetch(workerUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: payload,
    }).catch(console.error);
  }

  redirect(`/admin/benchmarks/${batch.id}`);
}

export async function updateResultNotesAction(formData: FormData) {
  await requireAdmin();
  const resultId = formData.get("result_id") as string;
  const notes = (formData.get("notes") as string)?.trim() || null;
  await supabaseAdmin
    .from("bench_results")
    .update({ notes })
    .eq("id", resultId);
}
