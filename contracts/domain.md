# Domínio do MVP

O `schema.sql` não está presente nesta branch. Estes nomes consolidam o contrato inicial e devem ser comparados com ele quando versionado.

| Enum | Valores |
| --- | --- |
| `RiskProfile` | `conservative`, `moderate`, `aggressive` |
| `AssetClass` | `cash`, `fixed_income`, `funds`, `equities`, `alternatives`, `other` |
| `AlertType` | `concentration`, `maturity`, `idle_cash`, `profile_review`, `news_impact`, `other` |
| `AlertPriority` | `high`, `medium`, `low` |
| `AlertStatus` | `open`, `reviewed`, `dismissed` |
| `InteractionChannel` | `meeting`, `call`, `whatsapp`, `email`, `note`, `other` |
| `DataSource` | `internal`, `open_finance`, `manual`, `news`, `synthetic` |

Usar `priority`, não `severity`; `channel`, não `type` para interações; e `source`, não `source_type`, para origem. Dados fictícios usam `synthetic`.

## Modelos

```json
{ "id": "uuid", "name": "string", "email": "string" }
```

`Advisor`. Relação esperada: `Advisor 1 ------ N Client`.

```json
{ "id": "uuid", "name": "string", "risk_profile": "moderate", "total_assets": "1280000.00", "open_alerts": 2, "attention_level": "high" }
```

`ClientSummary`.

```json
{ "id": "uuid", "client_id": "uuid", "asset_name": "string", "asset_class": "fixed_income", "issuer": "string|null", "institution_id": "uuid", "market_value": "250000.00", "allocation_pct": 19.5, "maturity_date": "2027-02-10|null", "liquidity": "string|null", "source": "internal" }
```

`Position`.

```json
{ "id": "uuid", "client_id": "uuid", "type": "concentration", "priority": "high", "status": "open", "title": "string", "description": "string", "source_refs": [] }
```

`Alert`.

```json
{ "id": "uuid", "client_id": "uuid", "channel": "meeting", "occurred_at": "2026-10-10T10:30:00-03:00", "summary": "string", "source": "manual" }
```

`Interaction`.

Referências de IA, briefing e alertas: `{ "type": "client|position|alert|interaction|news", "id": "uuid", "label": "string", "updated_at": "ISO-8601|null" }`.

## Em aberto

Relações, nulabilidade e restrições dependem do `schema.sql`. Taxonomias de `attention_level`, suitability, produtos, liquidez e instituições também estão em aberto.
