-- EP08 / issue #50: execução idempotente do job de atualização de notícias.

create table news_refresh_runs (
  id           uuid primary key default gen_random_uuid(),
  window_start timestamptz not null,
  window_end   timestamptz not null,
  status       text not null check (status in ('running', 'completed', 'failed')),
  error        text,
  started_at   timestamptz not null default now(),
  finished_at  timestamptz,
  check (window_end > window_start),
  unique (window_start, window_end)
);

-- O job é interno ao backend; não há acesso direto de usuários autenticados.
alter table news_refresh_runs enable row level security;

-- Cache materializado pelo job; a futura API apenas faz leitura destes resumos.
create table news_summary_cache (
  id           uuid primary key default gen_random_uuid(),
  period       text not null check (period in ('day', 'week')),
  window_start timestamptz not null,
  window_end   timestamptz not null,
  summary      text not null,
  highlights   jsonb not null default '[]',
  generated_at timestamptz not null,
  check (window_end > window_start),
  unique (period, window_start, window_end)
);

alter table news_summary_cache enable row level security;
