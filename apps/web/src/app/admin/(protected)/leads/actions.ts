"use server";

import { revalidatePath } from "next/cache";
import { createClient, isAdminEmail } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase";

const VALID_STATUSES = ["new", "contacted", "qualified", "converted", "not_a_fit"] as const;
type LeadStatus = (typeof VALID_STATUSES)[number];

async function requireAdmin(): Promise<string> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !isAdminEmail(user.email)) {
    throw new Error("Unauthorized");
  }
  return user.email!;
}

export async function updateLeadStatusAction(formData: FormData) {
  const adminEmail = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "") as LeadStatus;

  if (!id || !VALID_STATUSES.includes(status)) {
    throw new Error("Invalid input");
  }

  // Read previous status for audit
  const { data: prev } = await supabaseAdmin
    .from("leads")
    .select("status")
    .eq("id", id)
    .maybeSingle();

  const fromStatus = prev?.status ?? null;
  if (fromStatus === status) return;

  const now = new Date().toISOString();

  const { error } = await supabaseAdmin
    .from("leads")
    .update({
      status,
      status_changed_at: now,
      last_action_at: now,
    })
    .eq("id", id);

  if (error) throw new Error(error.message);

  // History row
  await supabaseAdmin.from("lead_status_history").insert({
    lead_id: id,
    from_status: fromStatus,
    to_status: status,
    admin_email: adminEmail,
  });

  // Audit log
  await supabaseAdmin.from("admin_audit_log").insert({
    admin_email: adminEmail,
    action: "lead.status_change",
    target_type: "lead",
    target_id: id,
    before: { status: fromStatus },
    after: { status },
  });

  revalidatePath("/admin/leads");
}
