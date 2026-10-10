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
