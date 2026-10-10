"""Persistência da feature alerts. Retorna models/tipos de domínio, nunca Response HTTP."""

from uuid import UUID

from sqlalchemy import case, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.features.alerts.models import Alert
from app.features.clients.models import Client
from app.shared.enums import AlertPriority, AlertStatus


class AlertRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def list_open_for_copilot(
        self,
        *,
        client_id: UUID | None,
        limit: int,
    ) -> list[tuple[Alert, str]]:
        priority_order = case(
            (Alert.priority == AlertPriority.HIGH, 0),
            (Alert.priority == AlertPriority.MEDIUM, 1),
            else_=2,
        )
        statement = (
            select(Alert, Client.full_name)
            .join(Client, Client.id == Alert.client_id)
            .where(Alert.status == AlertStatus.OPEN)
            .order_by(priority_order, Alert.updated_at.desc())
            .limit(limit)
        )
        if client_id is not None:
            statement = statement.where(Alert.client_id == client_id)
        result = await self.session.execute(statement)
        return list(result.all())
