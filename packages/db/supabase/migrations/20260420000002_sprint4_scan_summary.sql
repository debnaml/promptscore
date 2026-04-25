-- Migration: 002_sprint4_scan_summary
-- Adds: summary jsonb column to scans
-- Fixes: status constraint to include 'done' (was 'complete')

alter table scans add column if not exists summary jsonb;

-- Drop old constraint, add new one that includes 'done'
alter table scans drop constraint if exists scans_status_check;
alter table scans add constraint scans_status_check
  check (status in ('queued', 'running', 'done', 'complete', 'failed'));
