"""Contrato HTTP da feature alerts. Riscos e oportunidades gerados por regras explicáveis (EP03).

Montado em `/api/v1/alerts` por `app.main`.
"""

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Query

from app.features.alerts.dependencies import AlertServiceDep
from app.features.alerts.schemas import AlertOut, AlertReviewIn
from app.features.auth.dependencies import CurrentUser
from app.shared.enums import AlertPriority, AlertStatus, AlertType
from app.shared.pagination import Pagination
from app.shared.schemas import ERROR_RESPONSES, Page

router = APIRouter(responses=ERROR_RESPONSES)


@router.get("", response_model=Page[AlertOut], summary="Listar alertas")
async def list_alerts(
    service: AlertServiceDep,
    _user: CurrentUser,
    pagination: Pagination,
    client_id: Annotated[UUID | None, Query()] = None,
    type: Annotated[AlertType | None, Query()] = None,  # noqa: A002
    priority: Annotated[AlertPriority | None, Query()] = None,
    severity: Annotated[AlertPriority | None, Query(description="Alias de priority")] = None,
    status: Annotated[AlertStatus | None, Query()] = None,
) -> Page[AlertOut]:
    """Lista alertas por prioridade (alta primeiro) e data (recentes primeiro)."""
    items, meta = await service.list_alerts(
        client_id=client_id,
        type=type,
        priority=priority or severity,
        status=status,
        page=pagination.page,
        page_size=pagination.page_size,
    )
    return Page[AlertOut](items=items, meta=meta)


@router.get("/{alert_id}", response_model=AlertOut, summary="Detalhar alerta")
async def get_alert(alert_id: UUID, service: AlertServiceDep, _user: CurrentUser) -> AlertOut:
    """Retorna o alerta com explicação, fatos e fontes."""
    return await service.get_alert(alert_id)


@router.patch("/{alert_id}", response_model=AlertOut, summary="Revisar alerta")
async def review_alert(
    alert_id: UUID, body: AlertReviewIn, service: AlertServiceDep, user: CurrentUser
) -> AlertOut:
    """Marca o alerta como revisado ou descartado pelo assessor autenticado."""
    return await service.review_alert(alert_id, body.status, user.id)
