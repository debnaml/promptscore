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

export async function saveAdminNotesAction(formData: FormData) {
  const adminEmail = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const notes = String(formData.get("admin_notes") ?? "");

  if (!id) throw new Error("Missing lead id");

  const { error } = await supabaseAdmin
    .from("leads")
    .update({ admin_notes: notes, last_action_at: new Date().toISOString() })
    .eq("id", id);

  if (error) throw new Error(error.message);

  await supabaseAdmin.from("admin_audit_log").insert({
    admin_email: adminEmail,
    action: "lead.notes_update",
    target_type: "lead",
    target_id: id,
    after: { admin_notes: notes },
  });

  revalidatePath(`/admin/leads/${id}`);
}
