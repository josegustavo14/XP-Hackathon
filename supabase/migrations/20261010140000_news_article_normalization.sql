-- EP08 / issue #45: metadados para normalização e deduplicação de notícias.
-- Não persiste conteúdo integral: somente resumo, link e hashes.

alter table news_articles
  add column external_id text,
  add column collected_at timestamptz not null default now(),
  add column title_hash text,
  add column content_hash text;

-- Fontes podem não informar a data de publicação na primeira coleta.
alter table news_articles alter column published_at drop not null;

-- Também preserva compatibilidade com seeds e importações anteriores aos adapters.
create or replace function set_news_article_hashes()
returns trigger language plpgsql as $$
begin
  new.title_hash := coalesce(
    new.title_hash,
    md5(lower(new.source) || E'\n' || lower(regexp_replace(new.title, '\\s+', ' ', 'g')))
  );
  new.content_hash := coalesce(new.content_hash, new.title_hash);
  return new;
end;
$$;

create trigger set_news_article_hashes_before_write
before insert or update of source, title on news_articles
for each row execute function set_news_article_hashes();

-- Linhas anteriores à migration recebem hashes determinísticos de fallback.
update news_articles
set
  title_hash = md5(lower(source) || E'\\n' || lower(regexp_replace(title, '\\s+', ' ', 'g'))),
  content_hash = md5(lower(source) || E'\\n' || lower(regexp_replace(title, '\\s+', ' ', 'g')))
where title_hash is null or content_hash is null;

alter table news_articles
  alter column title_hash set not null,
  alter column content_hash set not null;

create unique index news_articles_source_external_id_unique
  on news_articles (source, external_id)
  where external_id is not null;
create unique index news_articles_source_title_hash_unique
  on news_articles (source, title_hash);
create unique index news_articles_content_hash_unique on news_articles (content_hash);
