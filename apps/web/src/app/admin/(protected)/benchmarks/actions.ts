"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
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

export async function createBatchAction(_prevState: string | null, formData: FormData): Promise<string | null> {
  let batchId: string | null = null;
  try {
    const adminEmail = await requireAdmin();

    const name = (formData.get("name") as string)?.trim();
    const urlsRaw = formData.get("urls") as string;
    const delaySeconds = Math.max(10, Number(formData.get("delay_seconds") ?? 30));

    if (!name) return "Name is required";

    const entries = parseEntries(urlsRaw ?? "");
    if (entries.length === 0) return "No valid URLs provided";
    if (entries.length > 100) return "Maximum 100 URLs per batch";

    for (const e of entries) {
      try { new URL(e.url); } catch {
        return `Invalid URL: ${e.url}`;
      }
    }

    const { data: batch, error: batchErr } = await supabaseAdmin
      .from("bench_batches")
      .insert({ name, total_urls: entries.length, delay_seconds: delaySeconds, created_by: adminEmail })
      .select("id")
      .single();

    if (batchErr || !batch) return `Failed to create batch: ${batchErr?.message}`;
    batchId = batch.id;

    const resultRows = entries.map((e, i) => ({
      batch_id: batch.id,
      url: e.url,
      label: e.label,
      position: i + 1,
    }));

    const { error: resErr } = await supabaseAdmin.from("bench_results").insert(resultRows);
    if (resErr) return `Failed to create result rows: ${resErr.message}`;

    const { data: firstResult } = await supabaseAdmin
      .from("bench_results")
      .select("id")
      .eq("batch_id", batch.id)
      .order("position", { ascending: true })
      .limit(1)
      .single();

    if (!firstResult) return "No results found after insert";

    const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? process.env.VERCEL_PROJECT_PRODUCTION_URL ?? process.env.VERCEL_URL ?? "localhost:3000").replace(/\/$/, "");
    const workerUrl = appUrl.startsWith("http") ? `${appUrl}/api/admin/benchmarks/worker` : `https://${appUrl}/api/admin/benchmarks/worker`;
    console.log("[bench] worker URL:", workerUrl);
    const payload = JSON.stringify({ batchId: batch.id, resultId: firstResult.id });

    try {
      if (process.env.QSTASH_TOKEN) {
        await qstash.publish({
          url: workerUrl,
          body: payload,
          headers: { "Content-Type": "application/json" },
          timeout: 300,
        });
      } else {
        fetch(workerUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: payload,
        }).catch(console.error);
      }
    } catch (qe) {
      console.error("[bench] QStash publish failed:", qe);
      // Don't block redirect — batch + results are created, worker can be retried
    }
  } catch (e) {
    return `Unexpected error: ${String(e)}`;
  }

  revalidatePath("/admin/benchmarks");
  redirect(`/admin/benchmarks/${batchId}`);
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
