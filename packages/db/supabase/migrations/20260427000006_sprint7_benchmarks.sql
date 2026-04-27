-- Sprint 7: Benchmark mode
-- bench_batches: one comparison run (e.g. "UK luxury resorts — April 2026")
create table if not exists bench_batches (
  id             uuid primary key default gen_random_uuid(),
  name           text not null,
  status         text not null default 'pending'
                   check (status in ('pending','running','complete','failed')),
  total_urls     integer not null default 0,
  completed_urls integer not null default 0,
  failed_urls    integer not null default 0,
  delay_seconds  integer not null default 30,
  created_by     text,
  created_at     timestamptz not null default now(),
  completed_at   timestamptz
);

-- bench_results: one row per URL within a batch
create table if not exists bench_results (
  id           uuid primary key default gen_random_uuid(),
  batch_id     uuid not null references bench_batches(id) on delete cascade,
  url          text not null,
  label        text,
  position     integer not null,
  scan_id      uuid references scans(id),
  status       text not null default 'pending'
                 check (status in ('pending','running','complete','failed')),
  error        text,
  notes        text,          -- inline editorial notes (admin fills in after review)
  created_at   timestamptz not null default now(),
  completed_at timestamptz
);

create index if not exists bench_results_batch_position on bench_results(batch_id, position);
create index if not exists bench_results_scan_id on bench_results(scan_id);
