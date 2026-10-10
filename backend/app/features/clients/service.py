"""Regras de negócio da feature clients e indicadores do dashboard (EP01/EP04)."""

from uuid import UUID

from typing import Any
from uuid import UUID

from app.features.clients.repository import ClientRepository
from app.features.clients.schemas import ClientDetail, ClientListItem, DashboardSummary
from app.shared.enums import RiskProfile
from app.shared.exceptions import NotFoundError
from app.shared.schemas import Page, PageMeta


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
    async def list_clients(
        self,
        *,
        advisor_id: UUID | None = None,
        search: str | None = None,
        risk_profile: RiskProfile | None = None,
        page: int = 1,
        page_size: int = 25,
    ) -> Page[ClientListItem]:
        """Consulta paginada de clientes com filtros de busca."""
        items, total = await self.repository.list_clients(
            advisor_id=advisor_id,
            search=search,
            risk_profile=risk_profile,
            page=page,
            page_size=page_size,
        )
        return Page(
            items=[ClientListItem.model_validate(it) for it in items],
            meta=PageMeta.build(page=page, page_size=page_size, total=total),
        )

    async def get_client_by_id(
        self, client_id: UUID, *, advisor_id: UUID | None = None
    ) -> ClientDetail:
        """Retorna os detalhes 360º de um cliente ou lança NotFoundError."""
        client = await self.repository.get_client_by_id(client_id, advisor_id=advisor_id)
        if not client:
            raise NotFoundError("Cliente não encontrado.", code="CLIENT_NOT_FOUND")
        return ClientDetail.model_validate(client)

    async def get_dashboard_summary(self, *, advisor_id: UUID | None = None) -> DashboardSummary:
        """Gera as métricas do painel inicial e fila de prioridades."""
        summary = await self.repository.get_dashboard_summary(advisor_id=advisor_id)
        return DashboardSummary.model_validate(summary)
