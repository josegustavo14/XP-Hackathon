# Banco de dados

PostgreSQL no Supabase. A autorização fica no próprio banco, via Row Level Security: cada assessor só enxerga os próprios clientes.

| Arquivo | O que é |
|---|---|
| `supabase/migrations/*_init_schema.sql` | Schema: tabelas, views, regras de alerta, RLS e auditoria |
| `supabase/seed.sql` | Dados sintéticos da demo. **Arquivo gerado, não editar à mão** |
| `database/generate_seed.py` | Gerador do seed (Python 3.10+, só biblioteca padrão) |
| `database/er-diagram.mmd` | Diagrama ER (colar em https://mermaid.live) |

## Aplicar localmente (Supabase CLI + Docker)

```bash
supabase init        # só na primeira vez; mantém a pasta migrations existente
supabase start
supabase db reset    # recria o banco: aplica as migrations e depois o seed.sql
```

## Aplicar no projeto remoto

```bash
supabase link --project-ref <ref>
supabase db push                                  # aplica as migrations
psql "<connection string>" -f supabase/seed.sql   # aplica o seed
```

> O seed **apaga todos os dados da aplicação** antes de inserir. Use só no banco da demo.

## Logins da demo

Senha: `Demo@2026`

| Assessor | E-mail | Clientes |
|---|---|---|
| Ana Souza | ana.souza@demo.xpcopilot.dev | 120 (cenário da demo) |
| Bruno Lima | bruno.lima@demo.xpcopilot.dev | 15 (serve para mostrar o isolamento por RLS) |

## Cenário da demo

O motor de alertas encontra exatamente 3 clientes de prioridade alta na carteira da Ana:

| Cliente | Situação | Notícia ligada |
|---|---|---|
| Helena Duarte (moderada, Petrolina) | 48% da carteira no emissor Banco Aurora, acima do limite coberto pelo FGC | Rebaixamento do rating do Banco Aurora |
| Ricardo Mendes (conservador, Londrina) | CDB de R$ 380 mil vencendo em 5 dias; precisa de liquidez para comprar imóvel | Banco Meridiano capta via CDB |
| Camila Rocha (conservadora, Chapecó) | ETF de cripto incompatível com o perfil + R$ 260 mil de herança parados há 75 dias | Bitcoin recua 12% |

Todos os três têm histórico de reuniões e pendências (algumas atrasadas), o que alimenta o briefing. Outros 14 alertas de prioridade média ou baixa dão realismo à lista.

**Aplique o seed no dia da apresentação.** As datas são relativas (`current_date + 5`) e os vencimentos "andam" com o calendário.

## Dados fictícios

Emissores, empresas, tickers e notícias são inventados. A exceção são XP e Tesouro Nacional. As notícias levam o prefixo `[Simulada]`. Não troque por empresas reais: seria publicar notícia falsa sobre empresa existente.

## Regerar o seed

```bash
python database/generate_seed.py
```

O resultado é determinístico (semente fixa e UUIDs estáveis): sem mudança no código, o arquivo gerado é o mesmo.

## Notas para o backend (FastAPI)

- **Dinheiro:** use `Decimal` no Python e string decimal no JSON, como no contrato (`"1250000.00"`). Nunca `float`.
- **RLS:** para as regras valerem, as consultas precisam rodar com o JWT do assessor. Duas formas:
  - repassar o token para o `supabase-py`/PostgREST;
  - ou, numa conexão direta, executar `set local role authenticated` e `set local request.jwt.claims = '<claims>'` na transação.
- **Chave de serviço:** a `service_role` ignora o RLS. Use só em jobs de sistema: `refresh_alerts()`, `match_news_to_clients()`, `take_portfolio_snapshot()` e a integração Open Finance, que é a única que escreve `clients.net_worth`.
- **Perfil de risco:** o banco usa `conservative | moderate | aggressive`. O contrato do frontend usa `conservador | moderado | arrojado`. Mapear na camada de schemas (Pydantic).
- **Embeddings:** `interactions.embedding` vem vazio. O backend gera os vetores (dimensão 1024) depois do seed.
