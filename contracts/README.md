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
