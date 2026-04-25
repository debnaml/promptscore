-- Migration: 003_sprint5_leads_consent
-- Adds GDPR consent fields, role, unlock_token, pdf tracking to leads
-- Adds report_unlocked flag to scans

alter table leads add column if not exists role text;
alter table leads add column if not exists unlock_token text unique;
alter table leads add column if not exists consent_ip_hash text;
alter table leads add column if not exists consent_timestamp timestamptz;
alter table leads add column if not exists unsubscribed boolean not null default false;
alter table leads add column if not exists unsubscribed_at timestamptz;
alter table leads add column if not exists pdf_generated_at timestamptz;
alter table leads add column if not exists pdf_url text;

create index if not exists idx_leads_unlock_token on leads (unlock_token);

-- Allow upsert on (email, scan_id) — re-submitting same email for same scan regenerates the token
alter table leads drop constraint if exists leads_email_scan_id_key;
alter table leads add constraint leads_email_scan_id_key unique (email, scan_id);
