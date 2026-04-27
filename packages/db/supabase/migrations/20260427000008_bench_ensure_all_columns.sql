-- Ensure all bench_batches columns exist (guards against partial initial creation)
alter table bench_batches add column if not exists status         text not null default 'pending';
alter table bench_batches add column if not exists total_urls     integer not null default 0;
alter table bench_batches add column if not exists completed_urls integer not null default 0;
alter table bench_batches add column if not exists failed_urls    integer not null default 0;
alter table bench_batches add column if not exists delay_seconds  integer not null default 30;
alter table bench_batches add column if not exists created_by     text;
alter table bench_batches add column if not exists completed_at   timestamptz;

-- Ensure all bench_results columns exist
alter table bench_results add column if not exists label        text;
alter table bench_results add column if not exists scan_id      uuid references scans(id);
alter table bench_results add column if not exists status       text not null default 'pending';
alter table bench_results add column if not exists error        text;
alter table bench_results add column if not exists notes        text;
alter table bench_results add column if not exists completed_at timestamptz;
