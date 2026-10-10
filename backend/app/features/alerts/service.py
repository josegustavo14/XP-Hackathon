"""Regras de negócio da feature alerts.

Recebe tipos de domínio (nunca `Request`) e levanta exceções de
`app.shared.exceptions`; a tradução para HTTP acontece no boundary.
"""

from datetime import UTC, datetime
from typing import Any
from uuid import UUID

from app.features.alerts.repository import AlertRepository
from app.features.alerts.schemas import AlertOut, SourceRef
from app.shared.enums import AlertPriority, AlertStatus, AlertType
from app.shared.exceptions import NotFoundError
from app.shared.schemas import PageMeta


def _to_out(row: Any) -> AlertOut:
    return AlertOut(
        id=row.id,
        client_id=row.client_id,
        type=row.type,
        priority=row.priority,
        status=row.status,
        title=row.title,
        explanation=f"{row.title}. Critério: {row.rule_description}",
        facts=row.evidence,
        source_refs=[SourceRef(type="client", id=row.client_id)],
        created_at=row.created_at,
        reviewed_at=row.reviewed_at,
    )


def _require(row: Any) -> Any:
    if row is None:
        raise NotFoundError("Alerta não encontrado.")
    return row


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
    async def list_alerts(
        self,
        *,
        client_id: UUID | None,
        type: AlertType | None,  # noqa: A002
        priority: AlertPriority | None,
        status: AlertStatus | None,
        page: int,
        page_size: int,
    ) -> tuple[list[AlertOut], PageMeta]:
        rows, total = await self.repository.list(
            client_id=client_id,
            type=type,
            priority=priority,
            status=status,
            offset=(page - 1) * page_size,
            limit=page_size,
        )
        meta = PageMeta.build(page=page, page_size=page_size, total=total)
        return [_to_out(r) for r in rows], meta

    async def get_alert(self, alert_id: UUID) -> AlertOut:
        return _to_out(_require(await self.repository.get(alert_id)))

    async def review_alert(
        self, alert_id: UUID, status: AlertStatus, reviewer_id: UUID
    ) -> AlertOut:
        row = await self.repository.update_review(
            alert_id, status=status, reviewed_by=reviewer_id, reviewed_at=datetime.now(UTC)
        )
        return _to_out(_require(row))
