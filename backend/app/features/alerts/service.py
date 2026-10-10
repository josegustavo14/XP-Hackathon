"""Regras de negócio da feature alerts.

Recebe tipos de domínio (nunca `Request`) e levanta exceções de
`app.shared.exceptions`; a tradução para HTTP acontece no boundary.
"""

from typing import Any
from uuid import UUID

from app.features.alerts.repository import AlertRepository


class AlertService:
    def __init__(self, repository: AlertRepository) -> None:
        self.repository = repository

    async def list_open_for_copilot(
        self,
        *,
        client_id: UUID | None,
        limit: int = 20,
    ) -> list[dict[str, Any]]:
        rows = await self.repository.list_open_for_copilot(
            client_id=client_id,
            limit=max(1, min(limit, 50)),
        )
        return [
            {
                "id": str(alert.id),
                "client_id": str(alert.client_id),
                "client_name": client_name,
                "type": alert.type.value,
                "priority": alert.priority.value,
                "title": alert.title,
                "evidence": alert.evidence,
                "updated_at": alert.updated_at.isoformat(),
            }
            for alert, client_name in rows
        ]
