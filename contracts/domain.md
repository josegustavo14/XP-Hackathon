# Domínio do MVP

O `schema.sql` esperado como referência concreta ainda não está presente nesta branch. Portanto, os contratos abaixo consolidam somente o vocabulário solicitado e devem ser conferidos contra o schema quando ele for versionado.

## Enums

| Enum | Valores |
| --- | --- |
| `RiskProfile` | `conservative`, `moderate`, `aggressive` |
| `AssetClass` | `cash`, `fixed_income`, `funds`, `equities`, `alternatives`, `other` |
| `AlertType` | `concentration`, `maturity`, `idle_cash`, `profile_review`, `news_impact`, `other` |
| `AlertPriority` | `high`, `medium`, `low` |
| `AlertStatus` | `open`, `reviewed`, `dismissed` |
| `InteractionChannel` | `meeting`, `call`, `whatsapp`, `email`, `note`, `other` |
| `DataSource` | `internal`, `open_finance`, `manual`, `news`, `synthetic` |

`priority` é o nome canônico para prioridade de alerta. `channel` é o nome canônico para o canal da interação. `source` é o nome canônico para a origem da posição. Não usar `severity`, `type` para canal, `source_type` ou dados fictícios com outra origem.

Mapeamento dos nomes conceituais iniciais: `AlertSeverity` foi consolidado como `AlertPriority`; `InteractionType` como `InteractionChannel`; e `DataSourceType` como `DataSource`. Os nomes dos campos permanecem `priority`, `channel` e `source`.

## Modelos

### Advisor

```json
{ "id": "uuid", "name": "string", "email": "string" }
```

### Client

```json
{ "id": "uuid", "advisor_id": "uuid", "name": "string", "email": "string|null" }
```

Relação do MVP: `Advisor 1 ------ N Client`.

### ClientSummary

```json
{
  "id": "uuid",
  "name": "string",
  "risk_profile": "moderate",
  "total_assets": "1280000.00",
  "open_alerts": 2,
  "attention_level": "high"
}
```

`attention_level` permanece um campo de apresentação do resumo; sua taxonomia oficial está **Em aberto**.

### Position

```json
{
  "id": "uuid",
  "client_id": "uuid",
  "asset_name": "string",
  "asset_class": "fixed_income",
  "issuer": "string|null",
  "institution_id": "uuid",
  "market_value": "250000.00",
  "allocation_pct": 19.5,
  "maturity_date": "2027-02-10|null",
  "liquidity": "string|null",
  "source": "internal"
}
```

### Alert

```json
{
  "id": "uuid",
  "client_id": "uuid",
  "type": "concentration",
  "priority": "high",
  "status": "open",
  "title": "string",
  "description": "string",
  "source_refs": []
}
```

### Interaction

```json
{
  "id": "uuid",
  "client_id": "uuid",
  "channel": "meeting",
  "occurred_at": "2026-10-10T14:00:00Z",
  "summary": "string",
  "source": "internal"
}
```

### SourceRef

Referência usada por respostas de IA, briefings e alertas:

```json
{
  "type": "client|position|alert|interaction|news",
  "id": "uuid",
  "label": "string",
  "updated_at": "ISO-8601|null"
}
```

### NewsItem

```json
{
  "id": "uuid",
  "title": "string",
  "summary": "string",
  "published_at": "ISO-8601",
  "source_name": "string",
  "url": "string|null",
  "source": "news"
}
```

### CopilotResponse

```json
{
  "answer": "string",
  "source_refs": []
}
```

As referências são opcionais quando não houver fontes aplicáveis, mas respostas factuais do copiloto devem retornar as fontes usadas.

## Em aberto

- Campos adicionais, nulabilidade e restrições devem ser confirmados contra o `schema.sql` quando disponível.
- Taxonomias oficiais de `attention_level`, suitability, produtos, liquidez e instituições ainda não foram fornecidas.
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
