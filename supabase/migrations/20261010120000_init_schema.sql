-- =============================================================================
-- XP Advisor Copilot — schema do banco (Supabase / PostgreSQL 15+)
--
-- Independente da stack de backend: qualquer backend (FastAPI, Node, Edge
-- Functions) conversa com este banco. Autorização é feita no próprio banco
-- via Row Level Security (RLS), usando auth.uid() do Supabase Auth.
--
-- Mapa backlog → objetos:
--   EP01 Dashboard ............ v_client_attention, v_portfolio_summary,
--                               portfolio_snapshots
--   EP02 Copiloto ............. ai_logs (rastreabilidade), views como "tools"
--   EP03 Riscos/oportunidades . alert_rules, alerts, refresh_alerts()
--   EP04 Perfil 360°/memória .. clients, goals, interactions, action_items
--   EP05 Briefing ............. briefings, news_articles, news_client_impacts
--   EP06 Open Finance ......... institutions, positions.source, consents,
--                               clients.net_worth
--   EP07 Segurança ............ advisors, políticas RLS, audit_log
--
-- Valores monetários: sempre numeric(18, 2). Nunca float/real.
-- =============================================================================

create extension if not exists vector with schema extensions;  -- pgvector: busca semântica
-- Supabase CLI roda migrations sem "extensions" no search_path: tipos e
-- operadores do pgvector são sempre qualificados (extensions.vector, ...)

-- -----------------------------------------------------------------------------
-- Tipos enumerados
-- -----------------------------------------------------------------------------

-- Perfil de suitability (Resolução CVM 30)
create type risk_profile as enum ('conservative', 'moderate', 'aggressive');

create type asset_class as enum (
  'cash',           -- saldo em conta
  'fixed_income',   -- CDB, LCI, LCA, debêntures, Tesouro
  'equities',       -- ações, BDRs, ETFs
  'funds',          -- fundos de investimento
  'real_estate',    -- FIIs
  'pension',        -- previdência
  'international',
  'crypto'
);

create type issuer_type as enum ('government', 'bank', 'company', 'fund_manager');

-- Origem do dado (US27: distinguir dado interno de dado externo autorizado)
create type data_source as enum ('xp', 'open_finance');

create type alert_type as enum (
  'issuer_concentration',   -- US10
  'upcoming_maturity',      -- US11
  'idle_cash',              -- US12
  'suitability_mismatch',   -- desenquadramento: ativo acima do perfil
  'low_diversification',
  'suitability_expiring'    -- questionário de suitability vencendo
);

create type alert_priority as enum ('low', 'medium', 'high');  -- ordem importa
create type alert_status   as enum ('open', 'reviewed', 'dismissed', 'resolved');

create type interaction_channel as enum ('meeting', 'call', 'whatsapp', 'email');
create type goal_status         as enum ('active', 'achieved', 'cancelled');
create type consent_status      as enum ('active', 'revoked', 'expired');
create type ai_log_kind         as enum ('chat', 'briefing', 'alert_explanation', 'news_relevance');
create type briefing_status     as enum ('draft', 'reviewed', 'used', 'discarded');
create type news_impact_status  as enum ('new', 'seen', 'dismissed');

-- Por que a notícia afeta o cliente; ordem = força do vínculo (mais forte primeiro)
create type news_match_type as enum (
  'holds_asset',       -- cliente tem o ativo citado
  'issuer_exposure',   -- cliente tem ativo do emissor citado
  'asset_class',       -- cliente tem exposição à classe citada
  'macro'              -- tema macro (juros, câmbio); atribuído pela IA
);

-- -----------------------------------------------------------------------------
-- Assessores e clientes
-- -----------------------------------------------------------------------------

-- 1:1 com auth.users; criado no signup ou pelo seed
create table advisors (
  id          uuid primary key references auth.users (id) on delete cascade,
  full_name   text not null,
  email       text not null unique,
  office      text,                       -- escritório / região
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Tratamento mínimo de dados pessoais: sem CPF, endereço ou telefone no MVP
create table clients (
  id                      uuid primary key default gen_random_uuid(),
  advisor_id              uuid not null references advisors (id),
  full_name               text not null,
  birthday                date,
  city                    text,
  state                   char(2),
  risk_profile            risk_profile not null,
  suitability_expires_at  date,
  investment_horizon_yrs  smallint,              -- horizonte declarado
  liquidity_need          text,                  -- ex.: 'reserva para imóvel em 2027'
  preferences             jsonb not null default '{}',  -- canal, horário, temas
  last_contact_at         timestamptz,
  next_contact_at         timestamptz,
  -- Patrimônio consolidado (todas as instituições). Escrito apenas pela
  -- integração Open Finance (service_role); assessor só lê — ver grants no fim
  net_worth               numeric(18, 2) check (net_worth >= 0),
  net_worth_updated_at    timestamptz,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);
create index on clients (advisor_id);

-- -----------------------------------------------------------------------------
-- Catálogo de ativos (dados de referência, leitura para qualquer assessor)
-- -----------------------------------------------------------------------------

create table institutions (
  id     uuid primary key default gen_random_uuid(),
  name   text not null unique,
  is_xp  boolean not null default false
);

create table issuers (
  id    uuid primary key default gen_random_uuid(),
  name  text not null unique,
  type  issuer_type not null
);

create table assets (
  id             uuid primary key default gen_random_uuid(),
  code           text not null unique,        -- ticker ou código interno
  name           text not null,
  asset_class    asset_class not null,
  issuer_id      uuid references issuers (id),
  risk_level     smallint not null check (risk_level between 1 and 5),
  maturity_date  date,                        -- null para ativos sem vencimento
  indexer        text,                        -- CDI, IPCA, PRE, ...
  rate           numeric(8, 4),               -- ex.: 1.10 = 110% CDI
  fgc_covered    boolean not null default false,
  updated_at     timestamptz not null default now()
);
create index on assets (maturity_date) where maturity_date is not null;

-- -----------------------------------------------------------------------------
-- Carteira (snapshot atual de posições)
-- -----------------------------------------------------------------------------

-- Consentimento Open Finance (seção 5 da proposta)
create table open_finance_consents (
  id              uuid primary key default gen_random_uuid(),
  client_id       uuid not null references clients (id) on delete cascade,
  institution_id  uuid not null references institutions (id),
  status          consent_status not null default 'active',
  scopes          text[] not null default '{investments}',
  granted_at      timestamptz not null default now(),
  expires_at      timestamptz not null,
  updated_at      timestamptz not null default now()
);
create index on open_finance_consents (client_id);

create table positions (
  id              uuid primary key default gen_random_uuid(),
  client_id       uuid not null references clients (id) on delete cascade,
  asset_id        uuid not null references assets (id),
  institution_id  uuid not null references institutions (id),   -- US26
  source          data_source not null default 'xp',            -- US27
  consent_id      uuid references open_finance_consents (id),
  quantity        numeric(20, 6) not null default 0,
  invested_value  numeric(18, 2) not null,
  market_value    numeric(18, 2) not null,
  held_since      date not null,   -- para caixa: desde quando está parado
  as_of           date not null default current_date,
  updated_at      timestamptz not null default now(),
  -- dado externo precisa de consentimento rastreável
  check (source = 'xp' or consent_id is not null),
  unique (client_id, asset_id, institution_id)
);
create index on positions (client_id);
create index on positions (asset_id);

-- -----------------------------------------------------------------------------
-- Perfil 360° e memória de relacionamento
-- -----------------------------------------------------------------------------

-- Meta opcional que o assessor registra para o cliente (0..N por cliente)
create table goals (                         -- US20
  id             uuid primary key default gen_random_uuid(),
  client_id      uuid not null references clients (id) on delete cascade,
  advisor_id     uuid not null references advisors (id),   -- quem definiu
  title          text not null,              -- ex.: 'Aposentadoria', 'Faculdade da filha'
  target_amount  numeric(18, 2),
  target_date    date,
  status         goal_status not null default 'active',
  notes          text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index on goals (client_id);

create table interactions (                  -- US18, US19
  id           uuid primary key default gen_random_uuid(),
  client_id    uuid not null references clients (id) on delete cascade,
  advisor_id   uuid not null references advisors (id),
  occurred_at  timestamptz not null default now(),
  channel      interaction_channel not null,
  summary      text not null,                -- pauta / o que foi conversado
  decisions    text,                         -- decisões tomadas pelo cliente
  -- Dimensão depende do modelo de embedding escolhido (1024 = Voyage,
  -- 1536 = OpenAI text-embedding-3-small). Ajustar antes de popular.
  embedding    extensions.vector(1024),
  created_at   timestamptz not null default now()
);
create index on interactions (client_id, occurred_at desc);
create index on interactions using hnsw (embedding extensions.vector_cosine_ops);

-- Pendências combinadas em reunião ("o que ficou de fazer")
create table action_items (
  id              uuid primary key default gen_random_uuid(),
  client_id       uuid not null references clients (id) on delete cascade,
  interaction_id  uuid references interactions (id) on delete set null,
  description     text not null,
  due_date        date,
  done_at         timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index on action_items (client_id) where done_at is null;

-- -----------------------------------------------------------------------------
-- Motor de alertas (regras determinísticas e explicáveis)
-- -----------------------------------------------------------------------------

-- Parâmetros das regras ficam em tabela: o copiloto pode ler e explicar
-- "quais critérios foram usados" (exemplo de uso da proposta, seção 01)
create table alert_rules (
  type         alert_type primary key,
  description  text not null,
  params       jsonb not null,
  enabled      boolean not null default true,
  updated_at   timestamptz not null default now()
);

insert into alert_rules (type, description, params) values
  ('issuer_concentration', 'Exposição a um único emissor privado acima do limite da carteira',
     '{"max_pct": 0.25, "high_pct": 0.40}'),
  ('upcoming_maturity', 'Ativo vencendo dentro da janela; planejar reinvestimento',
     '{"days": 30, "high_days": 7}'),
  ('idle_cash', 'Saldo em conta relevante e parado há muitos dias',
     '{"min_pct": 0.10, "min_days": 30}'),
  ('suitability_mismatch', 'Ativos com risco acima do permitido para o perfil do cliente',
     '{"max_risk": {"conservative": 2, "moderate": 3, "aggressive": 5}}'),
  ('low_diversification', 'Carteira concentrada em poucas classes de ativo',
     '{"min_classes": 3, "min_total": 50000}'),
  ('suitability_expiring', 'Questionário de suitability vencido ou prestes a vencer',
     '{"days": 30}');

create table alerts (
  id           uuid primary key default gen_random_uuid(),
  client_id    uuid not null references clients (id) on delete cascade,
  type         alert_type not null references alert_rules (type),
  priority     alert_priority not null,
  title        text not null,               -- "Cliente concentra 48% em Banco X"
  evidence     jsonb not null,              -- números que geraram o alerta (US13)
  rule_params  jsonb not null,               -- limites da regra usados neste alerta
  -- Mesma situação não gera alerta duplicado enquanto o alerta estiver ativo
  -- (inclusive depois de analisado ou descartado pelo assessor)
  dedupe_key   text not null,
  status       alert_status not null default 'open',
  reviewed_by  uuid references advisors (id),
  reviewed_at  timestamptz,
  review_note  text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  -- Preenchido pelo refresh_alerts() quando a condição deixa de existir
  closed_at    timestamptz
);
create unique index alerts_active_dedupe on alerts (dedupe_key) where closed_at is null;
create index on alerts (client_id, status);

-- -----------------------------------------------------------------------------
-- Rastreabilidade da IA (seção 5: fontes rastreáveis + revisão humana)
-- -----------------------------------------------------------------------------

create table ai_logs (
  id           uuid primary key default gen_random_uuid(),
  advisor_id   uuid not null references advisors (id),
  client_id    uuid references clients (id) on delete set null,
  kind         ai_log_kind not null,
  prompt       text not null,
  response     text not null,
  tool_calls   jsonb not null default '[]',  -- funções chamadas e argumentos
  sources      jsonb not null default '[]',  -- ids de alertas/posições usados (US08)
  model        text,
  created_at   timestamptz not null default now()
);
create index on ai_logs (advisor_id, created_at desc);

-- -----------------------------------------------------------------------------
-- Briefing pré-atendimento (EP05): documento revisável, ligado à reunião
-- -----------------------------------------------------------------------------

create table briefings (
  id              uuid primary key default gen_random_uuid(),
  client_id       uuid not null references clients (id) on delete cascade,
  advisor_id      uuid not null references advisors (id),
  meeting_at      timestamptz,                -- reunião para a qual foi preparado
  status          briefing_status not null default 'draft',
  -- Gerado pela IA; imutável depois de criado (ver grants)
  -- {"summary": "...", "attention_points": [...], "questions": [...], "topics": [...]}
  content         jsonb not null,
  edited_content  jsonb,                      -- versão revisada pelo assessor
  -- {"alert_ids": [...], "news_ids": [...], "interaction_ids": [...]}
  sources         jsonb not null default '{}',
  ai_log_id       uuid references ai_logs (id) on delete set null,
  interaction_id  uuid references interactions (id) on delete set null,  -- reunião realizada
  reviewed_at     timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index on briefings (client_id, created_at desc);
create index on briefings (advisor_id, meeting_at);

-- -----------------------------------------------------------------------------
-- Notícias de mercado (EP05 / US23)
-- -----------------------------------------------------------------------------

-- Sem dado de cliente: leitura para qualquer assessor. Guardar resumo + link,
-- não o texto integral (direitos autorais / termos da API)
create table news_articles (
  id             uuid primary key default gen_random_uuid(),
  source         text not null,               -- provedor da API ou 'seed'
  url            text not null unique,        -- evita duplicar a mesma notícia
  title          text not null,
  summary        text,
  language       text not null default 'pt',
  published_at   timestamptz not null,
  -- Tags que ligam a notícia às carteiras (da API ou extraídas na ingestão)
  tickers        text[] not null default '{}',            -- casa com assets.code
  issuer_ids     uuid[] not null default '{}',            -- casa com issuers.id
  asset_classes  asset_class[] not null default '{}',
  topics         text[] not null default '{}',            -- juros, câmbio, inflação...
  embedding      extensions.vector(1024),
  created_at     timestamptz not null default now()
);
create index on news_articles (published_at desc);
create index on news_articles using gin (tickers);
create index on news_articles using gin (issuer_ids);
create index on news_articles using gin (asset_classes);

-- Notícia × cliente afetado. Etapa 1 (match_news_to_clients) cria os pares por
-- regra determinística; etapa 2 (IA) preenche relevance/explanation só nos pares
create table news_client_impacts (
  id              uuid primary key default gen_random_uuid(),
  news_id         uuid not null references news_articles (id) on delete cascade,
  client_id       uuid not null references clients (id) on delete cascade,
  match_type      news_match_type not null,
  exposure_value  numeric(18, 2),             -- quanto da carteira está ligado à notícia
  exposure_pct    numeric(7, 4),              -- exposure_value / total da carteira
  matched         jsonb not null default '[]',  -- ativos que casaram
  relevance       smallint check (relevance between 0 and 100),  -- IA; null = não avaliado
  explanation     text,                       -- IA: "afeta 30% da carteira via Banco X"
  status          news_impact_status not null default 'new',
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (news_id, client_id)
);
create index on news_client_impacts (client_id, status);

-- -----------------------------------------------------------------------------
-- Histórico patrimonial: uma foto agregada por cliente por dia
-- -----------------------------------------------------------------------------

create table portfolio_snapshots (
  client_id       uuid not null references clients (id) on delete cascade,
  snapshot_date   date not null,
  total_value     numeric(18, 2) not null,
  xp_value        numeric(18, 2) not null,
  external_value  numeric(18, 2) not null,
  net_worth       numeric(18, 2),
  by_class        jsonb not null default '{}',  -- {"fixed_income": 78000.00, ...}
  created_at      timestamptz not null default now(),
  primary key (client_id, snapshot_date)
);

-- -----------------------------------------------------------------------------
-- updated_at automático em toda tabela editável
-- -----------------------------------------------------------------------------

create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

do $$
declare t text;
begin
  foreach t in array array['advisors', 'clients', 'assets', 'open_finance_consents',
                           'positions', 'goals', 'action_items', 'alert_rules', 'alerts',
                           'briefings', 'news_client_impacts']
  loop
    execute format('create trigger set_updated_at before update on %I
                    for each row execute function set_updated_at()', t);
  end loop;
end;
$$;

-- -----------------------------------------------------------------------------
-- Auditoria de alterações (seção 5: rastreabilidade)
-- Leituras não são auditadas aqui: trigger não captura SELECT
-- -----------------------------------------------------------------------------

-- Sem FKs de propósito: o registro sobrevive à exclusão do cliente
create table audit_log (
  id          bigint generated always as identity primary key,
  table_name  text not null,
  record_id   uuid not null,
  action      text not null check (action in ('insert', 'update', 'delete')),
  -- insert: valores gravados; update: só campos alterados {"campo": [antes, depois]};
  -- delete: null (não retém dados pessoais após exclusão — LGPD)
  changed     jsonb,
  actor_id    uuid,                 -- auth.uid(); null = sistema (seed, refresh_alerts)
  client_id   uuid,                 -- permite "histórico de alterações" na ficha 360°
  at          timestamptz not null default now()
);
create index on audit_log (client_id, at desc);
create index on audit_log (table_name, record_id);

-- Argumentos opcionais do trigger: colunas auditadas em updates (padrão: todas)
create or replace function audit_changes()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  old_row  jsonb := case when tg_op <> 'INSERT' then to_jsonb(old) end;
  new_row  jsonb := case when tg_op <> 'DELETE' then to_jsonb(new) end;
  row_data jsonb := coalesce(new_row, old_row);
  ignored  text[] := array['created_at', 'updated_at', 'embedding'];
  diff     jsonb;
begin
  if tg_op = 'UPDATE' then
    select jsonb_object_agg(n.key, jsonb_build_array(old_row -> n.key, n.value))
      into diff
      from jsonb_each(new_row) n
     where n.value is distinct from old_row -> n.key
       and n.key <> all (ignored)
       and (tg_nargs = 0 or n.key = any (tg_argv));
    if diff is null then
      return null;   -- nada relevante mudou (ex.: refresh só atualizou evidência)
    end if;
  elsif tg_op = 'INSERT' then
    diff := new_row - ignored;
  end if;

  insert into audit_log (table_name, record_id, action, changed, actor_id, client_id)
  values (tg_table_name, (row_data ->> 'id')::uuid, lower(tg_op), diff, auth.uid(),
          coalesce(row_data ->> 'client_id',
                   case when tg_table_name = 'clients' then row_data ->> 'id' end)::uuid);
  return null;
end;
$$;

create trigger audit after insert or update or delete on clients
  for each row execute function audit_changes();
create trigger audit after insert or update or delete on goals
  for each row execute function audit_changes();
create trigger audit after insert or update or delete on action_items
  for each row execute function audit_changes();
create trigger audit after insert or update or delete on open_finance_consents
  for each row execute function audit_changes();
-- Alertas: só o ciclo de revisão; mudanças de evidência a cada refresh são ruído
create trigger audit after insert or update or delete on alerts
  for each row execute function audit_changes('status', 'reviewed_by', 'review_note', 'closed_at');
-- Briefings: ciclo de revisão humana (o conteúdo em si fica na própria linha)
create trigger audit after insert or update or delete on briefings
  for each row execute function audit_changes('status', 'reviewed_at', 'meeting_at', 'interaction_id');

-- =============================================================================
-- Views (security_invoker: respeitam o RLS de quem consulta)
-- =============================================================================

-- Resumo da carteira por cliente (dashboard e perfil 360°)
create view v_portfolio_summary with (security_invoker = true) as
with by_class as (
  select p.client_id, a.asset_class,
         sum(p.market_value) as value,
         sum(p.market_value) filter (where p.source = 'xp')           as xp_value,
         sum(p.market_value) filter (where p.source = 'open_finance') as external_value
  from positions p join assets a on a.id = p.asset_id
  group by p.client_id, a.asset_class
)
select
  c.id                                     as client_id,
  c.advisor_id,
  coalesce(sum(b.value), 0)                as total_value,
  coalesce(sum(b.xp_value), 0)             as xp_value,
  coalesce(sum(b.external_value), 0)       as external_value,
  c.net_worth,
  -- Fatia do patrimônio que está na XP: oportunidade de captação
  round(coalesce(sum(b.xp_value), 0) / nullif(c.net_worth, 0), 4) as xp_share,
  count(b.asset_class)                     as asset_class_count,
  coalesce(jsonb_object_agg(b.asset_class, b.value) filter (where b.asset_class is not null),
           '{}')                           as by_class
from clients c
left join by_class b on b.client_id = c.id
group by c.id, c.advisor_id, c.net_worth;

-- Exposição por emissor (base da regra de concentração)
create view v_issuer_exposure with (security_invoker = true) as
select
  p.client_id,
  i.id    as issuer_id,
  i.name  as issuer_name,
  i.type  as issuer_type,
  sum(p.market_value) as value,
  sum(p.market_value) / nullif(t.total, 0) as pct
from positions p
join assets a  on a.id = p.asset_id
join issuers i on i.id = a.issuer_id
join (select client_id, sum(market_value) as total from positions group by client_id) t
  on t.client_id = p.client_id
group by p.client_id, i.id, i.name, i.type, t.total;

-- Lista priorizada do dashboard (US03, US14)
create view v_client_attention with (security_invoker = true) as
select
  c.id as client_id,
  c.advisor_id,
  c.full_name,
  c.risk_profile,
  c.next_contact_at,
  s.total_value,
  count(al.id)                                     as open_alerts,
  max(al.priority)                                 as top_priority,
  coalesce(array_agg(distinct al.type) filter (where al.id is not null), '{}') as alert_types
from clients c
join v_portfolio_summary s on s.client_id = c.id
left join alerts al on al.client_id = c.id and al.status = 'open'
group by c.id, c.advisor_id, c.full_name, c.risk_profile, c.next_contact_at, s.total_value;

-- =============================================================================
-- Geração de alertas: roda via cron (pg_cron), após o seed ou sob demanda
-- =============================================================================

create or replace function refresh_alerts()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  -- Retorna quantos alertas ativos foram criados ou atualizados
  r       jsonb;
  n       integer := 0;
  rows_n  integer;
begin
  -- 1. Concentração em emissor privado (Tesouro não conta)
  select params into r from alert_rules where type = 'issuer_concentration' and enabled;
  if found then
    insert into alerts (client_id, type, priority, title, evidence, rule_params, dedupe_key)
    select e.client_id, 'issuer_concentration',
           case when e.pct >= (r->>'high_pct')::numeric then 'high' else 'medium' end::alert_priority,
           format('%s%% da carteira concentrada em %s', round(e.pct * 100), e.issuer_name),
           jsonb_build_object('issuer', e.issuer_name, 'value', e.value,
                              'pct', round(e.pct, 4), 'limit_pct', r->'max_pct'),
           r, format('issuer_concentration:%s:%s', e.client_id, e.issuer_id)
    from v_issuer_exposure e
    where e.issuer_type <> 'government' and e.pct > (r->>'max_pct')::numeric
    on conflict (dedupe_key) where closed_at is null
      do update set evidence = excluded.evidence, priority = excluded.priority,
                    title = excluded.title, rule_params = excluded.rule_params, updated_at = now();
    get diagnostics rows_n = row_count; n := n + rows_n;
  end if;

  -- 2. Vencimentos próximos
  select params into r from alert_rules where type = 'upcoming_maturity' and enabled;
  if found then
    insert into alerts (client_id, type, priority, title, evidence, rule_params, dedupe_key)
    select p.client_id, 'upcoming_maturity',
           case when a.maturity_date - current_date <= (r->>'high_days')::int
                then 'high' else 'medium' end::alert_priority,
           format('%s vence em %s dias', a.name, a.maturity_date - current_date),
           jsonb_build_object('asset', a.name, 'maturity_date', a.maturity_date,
                              'days_left', a.maturity_date - current_date,
                              'value', p.market_value),
           r, format('upcoming_maturity:%s', p.id)
    from positions p join assets a on a.id = p.asset_id
    where a.maturity_date between current_date and current_date + (r->>'days')::int
    on conflict (dedupe_key) where closed_at is null
      do update set evidence = excluded.evidence, priority = excluded.priority,
                    title = excluded.title, rule_params = excluded.rule_params, updated_at = now();
    get diagnostics rows_n = row_count; n := n + rows_n;
  end if;

  -- 3. Caixa parado (soma o caixa parado em todas as instituições do cliente)
  select params into r from alert_rules where type = 'idle_cash' and enabled;
  if found then
    insert into alerts (client_id, type, priority, title, evidence, rule_params, dedupe_key)
    select ic.client_id, 'idle_cash', 'medium',
           format('R$ %s parados em conta há %s dias',
                  to_char(ic.value, 'FM999G999G990'), ic.idle_days),
           jsonb_build_object('value', ic.value, 'pct', round(ic.value / s.total_value, 4),
                              'idle_days', ic.idle_days),
           r, format('idle_cash:%s', ic.client_id)
    from (
      select p.client_id, sum(p.market_value) as value,
             max(current_date - p.held_since) as idle_days
      from positions p
      join assets a on a.id = p.asset_id
      where a.asset_class = 'cash'
        and current_date - p.held_since >= (r->>'min_days')::int
      group by p.client_id
    ) ic
    join v_portfolio_summary s on s.client_id = ic.client_id
    where ic.value / nullif(s.total_value, 0) >= (r->>'min_pct')::numeric
    on conflict (dedupe_key) where closed_at is null
      do update set evidence = excluded.evidence, title = excluded.title, rule_params = excluded.rule_params, updated_at = now();
    get diagnostics rows_n = row_count; n := n + rows_n;
  end if;

  -- 4. Desenquadramento: ativos acima do risco permitido pelo perfil
  select params into r from alert_rules where type = 'suitability_mismatch' and enabled;
  if found then
    insert into alerts (client_id, type, priority, title, evidence, rule_params, dedupe_key)
    select c.id, 'suitability_mismatch', 'high',
           format('%s ativo(s) acima do perfil %s', count(*),
                  case c.risk_profile when 'conservative' then 'conservador'
                                      when 'moderate' then 'moderado' else 'arrojado' end),
           jsonb_build_object('profile', c.risk_profile,
                              'max_risk', r->'max_risk'->>c.risk_profile::text,
                              'assets', jsonb_agg(jsonb_build_object(
                                'asset', a.name, 'risk_level', a.risk_level, 'value', p.market_value))),
           r, format('suitability_mismatch:%s', c.id)
    from clients c
    join positions p on p.client_id = c.id
    join assets a    on a.id = p.asset_id
    where a.risk_level > (r->'max_risk'->>c.risk_profile::text)::int
    group by c.id, c.risk_profile
    on conflict (dedupe_key) where closed_at is null
      do update set evidence = excluded.evidence, title = excluded.title, rule_params = excluded.rule_params, updated_at = now();
    get diagnostics rows_n = row_count; n := n + rows_n;
  end if;

  -- 5. Baixa diversificação
  select params into r from alert_rules where type = 'low_diversification' and enabled;
  if found then
    insert into alerts (client_id, type, priority, title, evidence, rule_params, dedupe_key)
    select s.client_id, 'low_diversification', 'low',
           format('Carteira em apenas %s classe(s) de ativo', s.asset_class_count),
           jsonb_build_object('asset_class_count', s.asset_class_count, 'by_class', s.by_class),
           r, format('low_diversification:%s', s.client_id)
    from v_portfolio_summary s
    where s.asset_class_count < (r->>'min_classes')::int
      and s.total_value >= (r->>'min_total')::numeric
    on conflict (dedupe_key) where closed_at is null
      do update set evidence = excluded.evidence, title = excluded.title, rule_params = excluded.rule_params, updated_at = now();
    get diagnostics rows_n = row_count; n := n + rows_n;
  end if;

  -- 6. Suitability vencendo
  select params into r from alert_rules where type = 'suitability_expiring' and enabled;
  if found then
    insert into alerts (client_id, type, priority, title, evidence, rule_params, dedupe_key)
    select c.id, 'suitability_expiring',
           case when c.suitability_expires_at < current_date then 'high' else 'medium' end::alert_priority,
           case when c.suitability_expires_at < current_date then 'Suitability vencido'
                else format('Suitability vence em %s dias', c.suitability_expires_at - current_date) end,
           jsonb_build_object('expires_at', c.suitability_expires_at),
           r, format('suitability_expiring:%s', c.id)
    from clients c
    where c.suitability_expires_at <= current_date + (r->>'days')::int
    on conflict (dedupe_key) where closed_at is null
      do update set evidence = excluded.evidence, priority = excluded.priority,
                    title = excluded.title, rule_params = excluded.rule_params, updated_at = now();
    get diagnostics rows_n = row_count; n := n + rows_n;
  end if;

  -- Fecha alertas cuja condição não apareceu nesta execução: todo alerta
  -- ainda válido acabou de receber updated_at = now() acima
  update alerts
     set closed_at = now(),
         status = case when status in ('open', 'reviewed') then 'resolved' else status end
   where closed_at is null and updated_at < now();

  return n;
end;
$$;

-- Só o backend (service_role) ou o cron disparam o recálculo
revoke execute on function refresh_alerts() from public, anon, authenticated;

-- Busca semântica no histórico de um cliente (memória inteligente / briefing)
create or replace function match_interactions(
  p_client_id  uuid,
  p_embedding  extensions.vector(1024),
  p_limit      int default 5
)
returns table (id uuid, occurred_at timestamptz, summary text, decisions text, similarity float)
language sql stable
security invoker   -- RLS de interactions continua valendo
as $$
  select i.id, i.occurred_at, i.summary, i.decisions,
         1 - (i.embedding operator(extensions.<=>) p_embedding) as similarity
  from interactions i
  where i.client_id = p_client_id and i.embedding is not null
  order by i.embedding operator(extensions.<=>) p_embedding
  limit p_limit;
$$;

-- Foto diária da carteira (cron). Reexecutar no mesmo dia sobrescreve a foto
create or replace function take_portfolio_snapshot(p_date date default current_date)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare n integer;
begin
  insert into portfolio_snapshots
    (client_id, snapshot_date, total_value, xp_value, external_value, net_worth, by_class)
  select client_id, p_date, total_value, xp_value, external_value, net_worth, by_class
  from v_portfolio_summary
  on conflict (client_id, snapshot_date) do update
    set total_value = excluded.total_value, xp_value = excluded.xp_value,
        external_value = excluded.external_value, net_worth = excluded.net_worth,
        by_class = excluded.by_class;
  get diagnostics n = row_count;
  return n;
end;
$$;

-- Etapa 1 do impacto de notícias: liga notícia a cliente quando a carteira tem
-- o ativo, o emissor ou a classe citada. Não sobrescreve avaliação da IA nem
-- o status dado pelo assessor. Tema 'macro' fica a cargo da etapa 2 (IA)
create or replace function match_news_to_clients(p_since timestamptz default now() - interval '7 days')
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare n integer;
begin
  insert into news_client_impacts
    (news_id, client_id, match_type, exposure_value, exposure_pct, matched)
  select m.news_id, m.client_id, min(m.match_type),
         sum(m.market_value),
         round(sum(m.market_value) / nullif(t.total, 0), 4),
         jsonb_agg(jsonb_build_object('asset', m.code, 'match', m.match_type,
                                      'value', m.market_value))
  from (
    select na.id as news_id, p.client_id, a.code, p.market_value,
           case when a.code = any (na.tickers)         then 'holds_asset'
                when a.issuer_id = any (na.issuer_ids) then 'issuer_exposure'
                else 'asset_class' end::news_match_type as match_type
    from news_articles na
    join assets a on a.code = any (na.tickers)
                  or a.issuer_id = any (na.issuer_ids)
                  or a.asset_class = any (na.asset_classes)
    join positions p on p.asset_id = a.id
    where na.published_at >= p_since
  ) m
  join (select client_id, sum(market_value) as total from positions group by client_id) t
    on t.client_id = m.client_id
  group by m.news_id, m.client_id, t.total
  on conflict (news_id, client_id) do update
    set match_type = excluded.match_type, exposure_value = excluded.exposure_value,
        exposure_pct = excluded.exposure_pct, matched = excluded.matched;
  get diagnostics n = row_count;
  return n;
end;
$$;

-- Só backend (service_role) ou cron
revoke execute on function take_portfolio_snapshot(date) from public, anon, authenticated;
revoke execute on function match_news_to_clients(timestamptz) from public, anon, authenticated;

-- =============================================================================
-- Row Level Security (US28, US31): assessor só enxerga a própria carteira
-- =============================================================================

create or replace function is_my_client(p_client_id uuid)
returns boolean
language sql stable
security definer
set search_path = public
as $$
  select exists (select 1 from clients where id = p_client_id and advisor_id = auth.uid());
$$;

alter table advisors              enable row level security;
alter table clients               enable row level security;
alter table institutions          enable row level security;
alter table issuers               enable row level security;
alter table assets                enable row level security;
alter table open_finance_consents enable row level security;
alter table positions             enable row level security;
alter table goals                 enable row level security;
alter table interactions          enable row level security;
alter table action_items          enable row level security;
alter table alert_rules           enable row level security;
alter table alerts                enable row level security;
alter table ai_logs               enable row level security;

-- Próprio cadastro
create policy advisors_self on advisors
  for select to authenticated using (id = auth.uid());

-- Carteira de clientes
create policy clients_own on clients
  for all to authenticated
  using (advisor_id = auth.uid()) with check (advisor_id = auth.uid());
-- Patrimônio (net_worth*) fica fora: só a integração Open Finance escreve.
-- Ao criar coluna nova em clients, incluí-la aqui se o assessor puder editá-la
revoke insert, update on clients from authenticated;
grant insert (id, advisor_id, full_name, birthday, city, state, risk_profile,
              suitability_expires_at, investment_horizon_yrs, liquidity_need,
              preferences, last_contact_at, next_contact_at)
  on clients to authenticated;
grant update (advisor_id, full_name, birthday, city, state, risk_profile,
              suitability_expires_at, investment_horizon_yrs, liquidity_need,
              preferences, last_contact_at, next_contact_at)
  on clients to authenticated;

-- Dados de referência: leitura para qualquer usuário autenticado
create policy institutions_read on institutions for select to authenticated using (true);
create policy issuers_read      on issuers      for select to authenticated using (true);
create policy assets_read       on assets       for select to authenticated using (true);
create policy rules_read        on alert_rules  for select to authenticated using (true);

-- Carteira e consentimentos: leitura (escrita só via seed / integração)
create policy positions_read on positions
  for select to authenticated using (is_my_client(client_id));
create policy consents_read on open_finance_consents
  for select to authenticated using (is_my_client(client_id));

-- Memória de relacionamento: assessor lê e escreve nos próprios clientes
create policy goals_own on goals
  for all to authenticated
  using (is_my_client(client_id))
  with check (is_my_client(client_id) and advisor_id = auth.uid());
create policy action_items_own on action_items
  for all to authenticated
  using (is_my_client(client_id)) with check (is_my_client(client_id));
create policy interactions_read on interactions
  for select to authenticated using (is_my_client(client_id));
create policy interactions_write on interactions
  for insert to authenticated
  with check (is_my_client(client_id) and advisor_id = auth.uid());

-- Alertas: lê e altera status (US15); criação só via refresh_alerts()
create policy alerts_read on alerts
  for select to authenticated using (is_my_client(client_id));
create policy alerts_review on alerts
  for update to authenticated
  using (is_my_client(client_id))
  with check (is_my_client(client_id) and reviewed_by = auth.uid());
-- Assessor só altera os campos de revisão, nunca a evidência
revoke update on alerts from authenticated;
grant update (status, reviewed_by, reviewed_at, review_note) on alerts to authenticated;

-- Auditoria: leitura dos próprios clientes; escrita só pelo trigger
alter table audit_log enable row level security;
create policy audit_read on audit_log
  for select to authenticated using (is_my_client(client_id));
revoke insert, update, delete, truncate on audit_log from anon, authenticated;

-- Logs de IA: append-only para o próprio assessor
create policy ai_logs_read on ai_logs
  for select to authenticated using (advisor_id = auth.uid());
create policy ai_logs_insert on ai_logs
  for insert to authenticated with check (advisor_id = auth.uid());

alter table briefings           enable row level security;
alter table news_articles       enable row level security;
alter table news_client_impacts enable row level security;
alter table portfolio_snapshots enable row level security;

-- Briefings: assessor cria, lê e revisa os dos próprios clientes;
-- o conteúdo gerado pela IA não pode ser alterado, só a versão editada
create policy briefings_read on briefings
  for select to authenticated using (is_my_client(client_id));
create policy briefings_insert on briefings
  for insert to authenticated
  with check (is_my_client(client_id) and advisor_id = auth.uid());
create policy briefings_review on briefings
  for update to authenticated
  using (is_my_client(client_id)) with check (is_my_client(client_id));
revoke update, delete on briefings from authenticated;
grant update (meeting_at, status, edited_content, interaction_id, reviewed_at)
  on briefings to authenticated;

-- Notícias: leitura geral; ingestão só pelo backend
create policy news_read on news_articles for select to authenticated using (true);

-- Impactos: leitura dos próprios clientes; assessor só muda o status
create policy news_impacts_read on news_client_impacts
  for select to authenticated using (is_my_client(client_id));
create policy news_impacts_status on news_client_impacts
  for update to authenticated
  using (is_my_client(client_id)) with check (is_my_client(client_id));
revoke update on news_client_impacts from authenticated;
grant update (status) on news_client_impacts to authenticated;

-- Histórico patrimonial: só leitura; escrito por take_portfolio_snapshot()
create policy snapshots_read on portfolio_snapshots
  for select to authenticated using (is_my_client(client_id));
