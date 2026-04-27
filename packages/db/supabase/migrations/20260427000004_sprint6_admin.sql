-- Sprint 6: Admin dashboard support
-- Adds lead lifecycle columns and audit log table.

-- Lead status (lifecycle tracking for sales)
alter table public.leads
  add column if not exists status text not null default 'new'
    check (status in ('new', 'contacted', 'qualified', 'converted', 'not_a_fit')),
  add column if not exists admin_notes text,
  add column if not exists last_action_at timestamptz,
  add column if not exists status_changed_at timestamptz;

create index if not exists leads_status_idx on public.leads (status);
create index if not exists leads_created_at_desc_idx on public.leads (created_at desc);

-- Lead status history (S6.4 timeline)
create table if not exists public.lead_status_history (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads(id) on delete cascade,
  from_status text,
  to_status text not null,
  admin_email text not null,
  changed_at timestamptz not null default now()
);

create index if not exists lead_status_history_lead_id_idx
  on public.lead_status_history (lead_id, changed_at desc);

-- Admin audit log (S6.10) — capture every admin action
create table if not exists public.admin_audit_log (
  id uuid primary key default gen_random_uuid(),
  admin_email text not null,
  action text not null,            -- e.g. 'lead.status_change', 'scan.recheck', 'settings.update'
  target_type text,                -- 'lead' | 'scan' | 'settings' | null
  target_id uuid,
  before jsonb,
  after jsonb,
  created_at timestamptz not null default now()
);

create index if not exists admin_audit_log_created_at_idx
  on public.admin_audit_log (created_at desc);
create index if not exists admin_audit_log_admin_email_idx
  on public.admin_audit_log (admin_email, created_at desc);
