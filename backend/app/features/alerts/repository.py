"""Persistência da feature alerts. Retorna models/tipos de domínio, nunca Response HTTP."""

from uuid import UUID

from sqlalchemy import case, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.features.alerts.models import Alert
from app.features.clients.models import Client
from app.shared.enums import AlertPriority, AlertStatus
from datetime import datetime
from typing import Any
from uuid import UUID

from sqlalchemy import Row, case, func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.features.alerts.models import Alert, AlertRule
from app.shared.enums import AlertPriority, AlertStatus, AlertType

_PRIORITY_ORDER = case(
    (Alert.priority == AlertPriority.HIGH, 0),
    (Alert.priority == AlertPriority.MEDIUM, 1),
    else_=2,
)


def _alert_select() -> Any:
    return select(
        Alert.id,
        Alert.client_id,
        Alert.type,
        Alert.priority,
        Alert.status,
        Alert.title,
        Alert.evidence,
        AlertRule.description.label("rule_description"),
        Alert.created_at,
        Alert.reviewed_at,
    ).join(AlertRule, AlertRule.type == Alert.type)


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
    async def list(
        self,
        *,
        client_id: UUID | None,
        type: AlertType | None,  # noqa: A002
        priority: AlertPriority | None,
        status: AlertStatus | None,
        offset: int,
        limit: int,
    ) -> tuple[list[Row[Any]], int]:
        filters = []
        if client_id is not None:
            filters.append(Alert.client_id == client_id)
        if type is not None:
            filters.append(Alert.type == type)
        if priority is not None:
            filters.append(Alert.priority == priority)
        if status is not None:
            filters.append(Alert.status == status)

        total = await self.session.scalar(select(func.count()).select_from(Alert).where(*filters))
        result = await self.session.execute(
            _alert_select()
            .where(*filters)
            .order_by(_PRIORITY_ORDER, Alert.created_at.desc())
            .offset(offset)
            .limit(limit)
        )
        return list(result.all()), total or 0

    async def get(self, alert_id: UUID) -> Row[Any] | None:
        result = await self.session.execute(_alert_select().where(Alert.id == alert_id))
        return result.first()

    async def update_review(
        self, alert_id: UUID, *, status: AlertStatus, reviewed_by: UUID, reviewed_at: datetime
    ) -> Row[Any] | None:
        await self.session.execute(
            update(Alert)
            .where(Alert.id == alert_id)
            .values(status=status, reviewed_by=reviewed_by, reviewed_at=reviewed_at)
        )
        return await self.get(alert_id)
