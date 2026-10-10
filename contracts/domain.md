# Domínio compartilhado

> O `schema.sql` não está presente neste worktree. Este documento registra somente a terminologia exigida para os contratos e os campos usados pelos mocks. Os enums oficiais, colunas obrigatórias e relacionamentos permanecem **Em aberto** até o schema ser disponibilizado.

## Entidades presentes nos mocks

| Modelo | Campos de contrato usados |
| --- | --- |
| Cliente | `id`, `name`, `risk_profile`, `email`, `phone`, `created_at` |
| Carteira | `client_id`, `as_of`, `total_value`, `positions` |
| Posição | `asset_code`, `asset_name`, `asset_class`, `quantity`, `unit_price`, `market_value`, `source` |
| Alerta | `id`, `client_id`, `kind`, `priority`, `status`, `created_at` |
| Interação | `id`, `client_id`, `channel`, `occurred_at`, `summary` |
| Briefing | `client_id`, `generated_at`, `summary`, `references` |
| Resposta do copiloto | `answer`, `references` |

## Enums e padronizações

| Campo | Valores usados nos mocks | Estado |
| --- | --- | --- |
| `risk_profile` | `conservador`, `moderado`, `arrojado` | Em aberto no schema |
| `priority` | `low`, `medium`, `high` | Campo obrigatório de alertas; não usar `severity` |
| `status` de alerta | `open`, `acknowledged`, `resolved` | Em aberto no schema |
| `channel` | `meeting`, `phone`, `email` | Campo obrigatório de interações; não usar `type` |
| `source` de posição | `synthetic` | Campo obrigatório; não usar `source_type` |
| `asset_class` | `fixed_income`, `equity`, `fund` | Em aberto no schema |

## Referências de IA

Respostas de copiloto e briefing podem retornar `references`. Cada referência informa `source`, `id`, `label` e `as_of`, permitindo revisão humana da origem da resposta.

## Em aberto

- Enums oficiais e regras de validação do banco.
- Relações e cardinalidades definitivas.
- Campos cadastrais permitidos para clientes.
- Contratos de autenticação, autorização e paginação por cursor.
