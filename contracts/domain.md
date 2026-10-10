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
