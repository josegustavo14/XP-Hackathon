-- Escopo explícito de clientes por assessor (EP07).
-- Mantém clients.advisor_id por compatibilidade e faz backfill para a tabela de autorização.

create table if not exists advisor_clients (
  advisor_id  uuid not null references advisors (id) on delete cascade,
  client_id   uuid not null references clients (id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (advisor_id, client_id)
);

create index if not exists advisor_clients_client_id_idx on advisor_clients (client_id);

insert into advisor_clients (advisor_id, client_id)
select advisor_id, id from clients
on conflict (advisor_id, client_id) do nothing;

alter table advisor_clients enable row level security;

create policy advisor_clients_own on advisor_clients
  for select to authenticated using (advisor_id = auth.uid());

create or replace function is_my_client(p_client_id uuid)
returns boolean
language sql stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from advisor_clients
    where client_id = p_client_id and advisor_id = auth.uid()
  );
$$;

drop policy if exists clients_own on clients;
create policy clients_select on clients
  for select to authenticated using (is_my_client(id));
create policy clients_insert on clients
  for insert to authenticated with check (advisor_id = auth.uid());
create policy clients_update on clients
  for update to authenticated using (is_my_client(id)) with check (is_my_client(id));
create policy clients_delete on clients
  for delete to authenticated using (is_my_client(id));
