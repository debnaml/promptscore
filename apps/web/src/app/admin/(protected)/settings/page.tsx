import { supabaseAdmin } from "@/lib/supabase";
import { saveSettingsAction } from "./actions";

export const dynamic = "force-dynamic";

async function getSetting<T>(key: string, fallback: T): Promise<T> {
  const { data } = await supabaseAdmin
    .from("admin_settings")
    .select("value")
    .eq("key", key)
    .maybeSingle();
  return (data?.value ?? fallback) as T;
}

export default async function SettingsPage() {
  const [
    rateLimitPublic,
    rateLimitAdmin,
    domainBlocklist,
    domainAlwaysRescan,
    slackWebhookUrl,
  ] = await Promise.all([
    getSetting<{ requests_per_hour: number }>("rate_limit_public", { requests_per_hour: 10 }),
    getSetting<{ requests_per_hour: number }>("rate_limit_admin", { requests_per_hour: 100 }),
    getSetting<string[]>("domain_blocklist", []),
    getSetting<string[]>("domain_always_rescan", []),
    getSetting<string | null>("slack_webhook_url", null),
  ]);

  return (
    <div className="p-6 max-w-2xl">
      <h1 className="text-xl font-semibold text-slate-900 mb-6">Settings</h1>

      <form action={saveSettingsAction} className="space-y-6">

        <fieldset className="bg-white rounded-md border border-slate-200 p-4 space-y-4">
          <legend className="text-sm font-medium text-slate-700 px-1">Rate limits</legend>

          <Field
            label="Public scans per hour (per IP)"
            name="rate_limit_public"
            type="number"
            min={1}
            defaultValue={String(rateLimitPublic.requests_per_hour)}
          />
          <Field
            label="Admin scans per hour"
            name="rate_limit_admin"
            type="number"
            min={1}
            defaultValue={String(rateLimitAdmin.requests_per_hour)}
          />
        </fieldset>

        <fieldset className="bg-white rounded-md border border-slate-200 p-4 space-y-4">
          <legend className="text-sm font-medium text-slate-700 px-1">Domain lists</legend>

          <TextareaField
            label="Domain blocklist"
            name="domain_blocklist"
            hint="One domain per line. These domains cannot be scanned."
            defaultValue={domainBlocklist.join("\n")}
          />
          <TextareaField
            label="Always-rescan domains"
            name="domain_always_rescan"
            hint="One domain per line. Cache is bypassed for these domains."
            defaultValue={domainAlwaysRescan.join("\n")}
          />
        </fieldset>

        <fieldset className="bg-white rounded-md border border-slate-200 p-4">
          <legend className="text-sm font-medium text-slate-700 px-1">Integrations</legend>
          <Field
            label="Slack webhook URL"
            name="slack_webhook_url"
            type="url"
            defaultValue={slackWebhookUrl ?? ""}
            placeholder="https://hooks.slack.com/services/..."
          />
        </fieldset>

        <div className="bg-white rounded-md border border-slate-200 p-4">
          <div className="text-sm font-medium text-slate-700 mb-1">Scoring version</div>
          <div className="font-mono text-sm text-slate-500">v1 (deterministic + AI rubrics)</div>
          <div className="text-xs text-slate-400 mt-0.5">Read-only — update via code deploy.</div>
        </div>

        <button
          type="submit"
          className="rounded-md bg-slate-900 text-white text-sm font-medium px-4 py-2 hover:bg-slate-800"
        >
          Save settings
        </button>
      </form>
    </div>
  );
}

function Field({
  label, name, type = "text", defaultValue, placeholder, min,
}: {
  label: string; name: string; type?: string; defaultValue?: string; placeholder?: string; min?: number;
}) {
  return (
    <div>
      <label className="block text-sm text-slate-600 mb-1" htmlFor={name}>{label}</label>
      <input
        id={name}
        name={name}
        type={type}
        defaultValue={defaultValue}
        placeholder={placeholder}
        min={min}
        className="w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
    </div>
  );
}

function TextareaField({
  label, name, defaultValue, hint,
}: {
  label: string; name: string; defaultValue?: string; hint?: string;
}) {
  return (
    <div>
      <label className="block text-sm text-slate-600 mb-1" htmlFor={name}>{label}</label>
      <textarea
        id={name}
        name={name}
        rows={4}
        defaultValue={defaultValue}
        className="w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      {hint && <p className="text-xs text-slate-400 mt-0.5">{hint}</p>}
    </div>
  );
}
