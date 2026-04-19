-- Migration: 001_initial_schema
-- Creates: scans, scan_checks, leads, bench_batches

-- Enable UUID generation
create extension if not exists "pgcrypto";

-------------------------------------------------------
-- scans
-------------------------------------------------------
create table scans (
  id            uuid primary key default gen_random_uuid(),
  url           text not null,
  url_hash      text not null,
  content_hash  text,
  status        text not null default 'queued'
                  check (status in ('queued', 'running', 'complete', 'failed')),
  overall_score integer,
  category_scores jsonb,
  detected_category text,
  positives     jsonb,
  negatives     jsonb,
  priority_actions jsonb,
  started_at    timestamptz,
  completed_at  timestamptz,
  expires_at    timestamptz,
  created_at    timestamptz not null default now()
);

create index idx_scans_url_hash on scans (url_hash);
create index idx_scans_url on scans (url);
create index idx_scans_status on scans (status);

alter table scans enable row level security;

-------------------------------------------------------
-- scan_checks
-------------------------------------------------------
create table scan_checks (
  id        uuid primary key default gen_random_uuid(),
  scan_id   uuid not null references scans (id) on delete cascade,
  category  text not null,
  check_key text not null,
  score     integer,
  weight    numeric(4,2),
  evidence  jsonb,
  notes     text,
  created_at timestamptz not null default now()
);

create index idx_scan_checks_scan_id on scan_checks (scan_id);

alter table scan_checks enable row level security;

-------------------------------------------------------
-- leads
-------------------------------------------------------
create table leads (
  id                uuid primary key default gen_random_uuid(),
  name              text,
  email             text not null,
  company           text,
  website           text,
  scan_id           uuid references scans (id) on delete set null,
  consent_marketing boolean not null default false,
  synced_to_crm     boolean not null default false,
  created_at        timestamptz not null default now()
);

create index idx_leads_email on leads (email);
create index idx_leads_scan_id on leads (scan_id);

alter table leads enable row level security;

-------------------------------------------------------
-- bench_batches
-------------------------------------------------------
create table bench_batches (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  urls       jsonb not null default '[]'::jsonb,
  status     text not null default 'pending'
               check (status in ('pending', 'running', 'complete', 'failed')),
  results    jsonb,
  created_at timestamptz not null default now()
);

alter table bench_batches enable row level security;
