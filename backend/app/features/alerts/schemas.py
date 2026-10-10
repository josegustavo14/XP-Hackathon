"""Schemas Pydantic (request/response) da feature alerts.

Herdar de `app.shared.schemas.ApiModel`; enums vêm de `app.shared.enums`.
"""

from typing import Any
from uuid import UUID

from pydantic import Field

from app.shared.enums import AlertPriority, AlertType
from app.shared.schemas import ApiModel


class AlertCandidate(ApiModel):
    """Alerta detectado por uma regra, antes de ser persistido.

    Campos seguem `contracts/domain.md` (`priority`) e o enum do banco (`type`).
    """

    type: AlertType
    priority: AlertPriority
    client_id: UUID
    title: str
    facts: dict[str, Any]
    source_refs: list[dict[str, Any]] = Field(default_factory=list)
