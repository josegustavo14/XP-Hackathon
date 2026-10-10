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
