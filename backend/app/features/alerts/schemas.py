"""Schemas Pydantic (request/response) da feature alerts."""

from datetime import datetime
from typing import Any, Literal
from uuid import UUID

from pydantic import Field

from app.shared.enums import AlertPriority, AlertStatus, AlertType
from app.shared.schemas import ApiModel


class SourceRef(ApiModel):
    """Referência à fonte de um dado usado no alerta."""

    type: str
    id: UUID


class AlertCandidate(ApiModel):
    """Alerta gerado por uma regra antes de ser persistido."""

    type: AlertType
    priority: AlertPriority
    client_id: UUID
    title: str
    facts: dict[str, Any]
    source_refs: list[SourceRef] = Field(default_factory=list)


class AlertOut(ApiModel):
    id: UUID
    client_id: UUID
    type: AlertType
    priority: AlertPriority
    status: AlertStatus
    title: str
    explanation: str
    facts: dict[str, Any]
    source_refs: list[SourceRef]
    created_at: datetime
    reviewed_at: datetime | None


class AlertReviewIn(ApiModel):
    status: Literal[AlertStatus.REVIEWED, AlertStatus.DISMISSED]
