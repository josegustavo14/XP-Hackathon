# Contratos da API do XP Advisor

Convenções obrigatórias para desenvolvimento paralelo.

## Convenções globais

- Base URL: `/api/v1`.
- IDs são UUIDs como `string` (ex.: `"0199d9ea-8af8-7e7b-b631-3bcb04a8b680"`).
- Timestamps usam ISO 8601 com timezone (ex.: `"2026-10-10T10:30:00-03:00"`); datas sem horário usam `YYYY-MM-DD`.
- Dinheiro é `string` decimal, nunca `float`: `{ "amount": "1280000.00", "currency": "BRL" }`.
- Percentuais são `number` em pontos percentuais (ex.: `{ "allocation_pct": 42.5 }`).
- Ordenação quando aplicável: `?sort=created_at&order=desc`.
- O `advisor_id` nunca vem confiavelmente do frontend: o assessor é derivado da autenticação.

## Paginação

Query padrão: `?page=1&page_size=25`. `page` é 1-based; limite máximo de `page_size` está **Em aberto**.

```json
{ "items": [], "meta": { "page": 1, "page_size": 25, "total": 128, "total_pages": 6 } }
```

## Erro padrão

```json
{ "error": { "code": "CLIENT_NOT_FOUND", "message": "Cliente não encontrado.", "details": {}, "trace_id": "0199d9ea-8af8-7e7b-b631-3bcb04a8b680" } }
```

`details` pode ser omitido. `trace_id` é usado para correlação.

## HTTP

| Status | Uso |
| --- | --- |
| `200` | leitura ou alteração concluída |
| `201` | criação |
| `204` | operação sem payload |
| `400` | request semanticamente inválido |
| `401` | não autenticado |
| `403` | autenticado sem acesso |
| `404` | recurso inexistente |
| `409` | conflito |
| `422` | validação Pydantic |
| `500` | erro inesperado |

## Breaking changes

Mudanças incompatíveis exigem `/api/v2` ou decisão explícita registrada aqui: remover/renomear campos ou enums, mudar tipo/formato, tornar opcional obrigatório ou mudar o significado de valor existente. Adicionar campo opcional é compatível.

## Artefatos e pendências

- [domain.md](./domain.md): vocabulário e modelos.
- [frontend.ts](./frontend.ts): tipos TypeScript equivalentes.
- [mocks/](./mocks/): payloads fictícios consistentes.
- `openapi.json`: não gerado; esta branch não contém FastAPI, schemas Pydantic ou endpoints. Deve ser exportado automaticamente quando existirem.

## Em aberto

- Mecanismo de autenticação de produção da XP.
- Limite máximo de `page_size`.
- `schema.sql`, taxonomias oficiais, suitability e produtos não estão presentes nesta branch.
