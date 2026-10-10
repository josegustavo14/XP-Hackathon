"""Tools locais do copiloto: allowlist explícita delegada a services de domínio."""

import json
from dataclasses import dataclass, field
from uuid import UUID

from app.features.alerts.service import AlertService
from app.features.clients.service import ClientService
from app.features.copilot.llm import ToolCall, ToolDefinition
from app.features.copilot.schemas import CopilotSourceOut, SuggestedActionOut

TOOL_DEFINITIONS = [
    ToolDefinition(
        name="search_clients",
        description=(
            "Busca clientes do assessor pelo nome. Use antes de responder perguntas "
            "sobre clientes."
        ),
        parameters={
            "type": "object",
            "properties": {
                "query": {
                    "type": "string",
                    "description": (
                        "Nome completo ou trecho do nome; use string vazia para "
                        "listar clientes."
                    ),
                }
            },
            "required": ["query"],
            "additionalProperties": False,
        },
    ),
    ToolDefinition(
        name="list_open_alerts",
        description=(
            "Lista alertas abertos dos clientes acessíveis ao assessor, em "
            "prioridade decrescente."
        ),
        parameters={
            "type": "object",
            "properties": {},
            "required": [],
            "additionalProperties": False,
        },
    ),
]


@dataclass(slots=True)
class ToolExecution:
    content: str
    sources: list[CopilotSourceOut] = field(default_factory=list)
    suggested_actions: list[SuggestedActionOut] = field(default_factory=list)
    records_found: bool = False


class CopilotToolExecutor:
    def __init__(self, clients: ClientService, alerts: AlertService) -> None:
        self.clients = clients
        self.alerts = alerts

    async def execute(self, call: ToolCall, *, client_id: UUID | None) -> ToolExecution:
        if call.name == "search_clients":
            query = call.arguments.get("query")
            if not isinstance(query, str) or len(query) > 100:
                return ToolExecution(content='{"error":"query inválida"}')
            clients = await self.clients.search_for_copilot(
                query=query.strip() or None, client_id=client_id
            )
            sources = [
                CopilotSourceOut(
                    type="client",
                    id=UUID(client["id"]),
                    label=client["name"],
                    updated_at=client["updated_at"],
                )
                for client in clients
            ]
            actions = [
                SuggestedActionOut(
                    type="open_client",
                    label=f"Abrir {client['name']}",
                    target_id=UUID(client["id"]),
                )
                for client in clients[:3]
            ]
            return ToolExecution(
                content=json.dumps({"clients": clients}, ensure_ascii=False),
                sources=sources,
                suggested_actions=actions,
                records_found=bool(clients),
            )

        if call.name == "list_open_alerts":
            alerts = await self.alerts.list_open_for_copilot(client_id=client_id)
            sources = [
                CopilotSourceOut(
                    type="alert",
                    id=UUID(alert["id"]),
                    label=alert["title"],
                    updated_at=alert["updated_at"],
                )
                for alert in alerts
            ]
            actions = [
                SuggestedActionOut(
                    type="open_alert",
                    label=f"Abrir alerta: {alert['title']}",
                    target_id=UUID(alert["id"]),
                )
                for alert in alerts[:3]
            ]
            return ToolExecution(
                content=json.dumps({"alerts": alerts}, ensure_ascii=False),
                sources=sources,
                suggested_actions=actions,
                records_found=bool(alerts),
            )

        return ToolExecution(content='{"error":"ferramenta não permitida"}')
