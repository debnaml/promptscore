-- Add missing created_by column to bench_batches (skipped by IF NOT EXISTS on original migration)
alter table bench_batches add column if not exists created_by text;
