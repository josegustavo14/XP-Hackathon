"""Regras de negócio da feature clients.

Recebe tipos de domínio (nunca `Request`) e levanta exceções de
`app.shared.exceptions`; a tradução para HTTP acontece no boundary.
"""

from typing import Any
from uuid import UUID

from app.features.clients.repository import ClientRepository


class ClientService:
    def __init__(self, repository: ClientRepository) -> None:
        self.repository = repository

    async def search_for_copilot(
        self,
        *,
        query: str | None,
        client_id: UUID | None,
        limit: int = 10,
    ) -> list[dict[str, Any]]:
        clients = await self.repository.search_for_copilot(
            query=query,
            client_id=client_id,
            limit=max(1, min(limit, 20)),
        )
        return [
            {
                "id": str(client.id),
                "name": client.full_name,
                "risk_profile": client.risk_profile.value,
                "investment_horizon_yrs": client.investment_horizon_yrs,
                "updated_at": client.updated_at.isoformat(),
            }
            for client in clients
        ]
