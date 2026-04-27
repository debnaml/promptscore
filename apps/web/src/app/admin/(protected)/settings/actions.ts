"use server";

import { revalidatePath } from "next/cache";
import { createClient, isAdminEmail } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase";

async function requireAdmin(): Promise<string> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !isAdminEmail(user.email)) throw new Error("Unauthorized");
  return user.email!;
}

function parseLines(raw: string): string[] {
  return raw.split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
}

export async function saveSettingsAction(formData: FormData) {
  const adminEmail = await requireAdmin();

  const settings: Record<string, unknown> = {
    rate_limit_public:    { requests_per_hour: Number(formData.get("rate_limit_public") ?? 10) },
    rate_limit_admin:     { requests_per_hour: Number(formData.get("rate_limit_admin") ?? 100) },
    domain_blocklist:     parseLines(String(formData.get("domain_blocklist") ?? "")),
    domain_always_rescan: parseLines(String(formData.get("domain_always_rescan") ?? "")),
    slack_webhook_url:    (formData.get("slack_webhook_url") as string)?.trim() || null,
  };

  const now = new Date().toISOString();
  const rows = Object.entries(settings).map(([key, value]) => ({
    key,
    value: value === null ? null : value,
    updated_at: now,
    updated_by: adminEmail,
  }));

  for (const row of rows) {
    const prev = await supabaseAdmin
      .from("admin_settings")
      .select("value")
      .eq("key", row.key)
      .maybeSingle();

    await supabaseAdmin
      .from("admin_settings")
      .upsert(row, { onConflict: "key" });

    await supabaseAdmin.from("admin_audit_log").insert({
      admin_email: adminEmail,
      action: "settings.update",
      target_type: "settings",
      before: { [row.key]: prev.data?.value ?? null },
      after: { [row.key]: row.value },
    });
  }

  revalidatePath("/admin/settings");
}
