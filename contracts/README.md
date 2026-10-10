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
# Contratos do XP Advisor

Contratos versionados para o MVP do XP Advisor Copilot. O backend e o frontend devem consumir os nomes e formatos definidos aqui antes de adicionar novos conceitos por feature.

## Convenções da API

- Base de todas as rotas: `/api/v1`.
- Identificadores são UUIDs serializados como `string`.
- Datas e timestamps usam ISO 8601; datas sem horário usam `YYYY-MM-DD`.
- Valores monetários são `string` decimal, nunca `float` (por exemplo, `"1280000.00"`).
- Percentuais são `number` quando representam uma medida calculada (por exemplo, `19.5`).
- Paginação padrão: query `page` (1-based, padrão `1`) e `page_size` (padrão `20`, máximo `100`). Respostas paginadas usam `{ "items": [], "page": 1, "page_size": 20, "total": 0 }`.
- Erros usam `{ "error": { "code": "string", "message": "string", "details": {} } }`. `details` é opcional e pode conter dados de validação.
- Enums são enviados pelos valores literais documentados em [domain.md](./domain.md), em `snake_case`.

## Versionamento e breaking changes

Alterações incompatíveis exigem nova versão de API (`/api/v2`) ou uma decisão explícita registrada nesta pasta. São breaking changes: remover/renomear campos ou valores de enum, alterar tipos/formato, tornar campo opcional obrigatório e mudar o significado de um valor existente. Adicionar campos opcionais é compatível.

## Artefatos

- [domain.md](./domain.md): vocabulário, enums e modelos do domínio.
- [mocks/](./mocks/): payloads fictícios consistentes para desenvolvimento paralelo.
- `openapi.json`: ainda não gerado. A branch atual não contém backend FastAPI, schemas ou endpoints; gerar este arquivo quando esses artefatos existirem, sem inventar uma especificação manual.

## Em aberto

- Validar a taxonomia oficial da XP, caso seja fornecida.
- Validar categorias oficiais de suitability e produtos, caso a organização forneça outra nomenclatura.
- Incorporar o `schema.sql` como referência concreta assim que ele estiver disponível nesta linha de desenvolvimento.
# Contratos do XP Advisor Copilot

Estes contratos permitem o desenvolvimento em paralelo. Os mocks são dados fictícios e devem usar `synthetic` como origem de posições.

## Convenções comuns

- A base da API é `/api/v1`.
- Identificadores são UUIDs serializados como strings.
- Datas e horários usam ISO 8601. Datas sem horário usam `YYYY-MM-DD`.
- Valores monetários e quantidades financeiras são strings decimais, por exemplo `"1250000.50"`; nunca são `float`.
- Listagens paginadas retornam `items`, `page`, `page_size`, `total` e `total_pages`.
- Erros usam o formato:

```json
{
  "error": {
    "code": "RESOURCE_NOT_FOUND",
    "message": "Cliente não encontrado.",
    "details": {},
    "request_id": "uuid"
  }
}
```

## Mocks

Os arquivos em `mocks/` representam respostas completas. O frontend pode selecionar mocks ou API real sem alterar componentes visuais. Os IDs de clientes são estáveis entre todos os arquivos.

## OpenAPI e CI

`openapi.json` não foi criado porque este worktree ainda não contém uma aplicação FastAPI, schemas ou endpoints a partir dos quais gerar o snapshot.

Quando o backend existir, o snapshot deve ser gerado diretamente em `contracts/openapi.json` e a CI deve regenerá-lo e falhar caso haja diferença. A ferramenta e o comando de geração estão **Em aberto** até a estrutura do backend ser definida.

Enquanto isso, `types.ts` é o equivalente provisório em TypeScript para os formatos dos mocks. Ele deve ser substituído por tipos gerados de `openapi.json` quando o snapshot existir.

## Breaking changes

Alterações em nomes ou tipos obrigatórios de respostas já consumidas exigem, no mesmo PR ou em PRs coordenados:

1. atualização do schema OpenAPI;
2. atualização dos mocks afetados;
3. atualização do frontend consumidor;
4. descrição explícita da quebra na PR.

Não renomeie `priority` para `severity`, `channel` para `type` ou `source` para `source_type`.
