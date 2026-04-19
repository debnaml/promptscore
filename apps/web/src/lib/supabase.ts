import { createClient } from "@supabase/supabase-js";

if (!process.env.SUPABASE_URL) {
  throw new Error("Missing SUPABASE_URL environment variable");
}
if (!process.env.SUPABASE_SECRET_KEY && !process.env.SUPABASE_PUBLISHABLE_KEY) {
  throw new Error("Missing SUPABASE_SECRET_KEY or SUPABASE_PUBLISHABLE_KEY environment variable");
}

/**
 * Server-side Supabase client using the secret key (bypasses RLS).
 * Use this in API routes and server actions only.
 */
export const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_PUBLISHABLE_KEY!
);
