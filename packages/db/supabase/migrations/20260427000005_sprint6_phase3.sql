-- Sprint 6 Phase 3: settings table + scan AI cost log

-- Key-value settings store (one row per setting key)
create table if not exists public.admin_settings (
  key         text primary key,
  value       jsonb not null,
  updated_at  timestamptz not null default now(),
  updated_by  text
);

-- Seed default settings
insert into public.admin_settings (key, value) values
  ('rate_limit_public',   '{"requests_per_hour": 10}'::jsonb),
  ('rate_limit_admin',    '{"requests_per_hour": 100}'::jsonb),
  ('domain_blocklist',    '[]'::jsonb),
  ('domain_always_rescan','[]'::jsonb),
  ('slack_webhook_url',   'null'::jsonb)
on conflict (key) do nothing;

-- Per-check AI cost log (populated by scan worker for AI checks)
create table if not exists public.scan_ai_log (
  id            uuid primary key default gen_random_uuid(),
  scan_id       uuid not null references public.scans(id) on delete cascade,
  check_key     text not null,
  model         text not null,
  prompt_version text,
  input_hash    text,
  tokens_used   integer not null default 0,
  latency_ms    integer,
  created_at    timestamptz not null default now()
);

create index if not exists scan_ai_log_scan_id_idx on public.scan_ai_log (scan_id);
create index if not exists scan_ai_log_created_at_idx on public.scan_ai_log (created_at desc);
