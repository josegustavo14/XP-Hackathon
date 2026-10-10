"""Contrato HTTP da feature clients e dashboard do assessor (EP01/EP04)."""

from uuid import UUID

from fastapi import APIRouter, Query

from app.features.auth.dependencies import CurrentUser
from app.features.clients.dependencies import ClientServiceDep
from app.features.clients.schemas import ClientDetail, ClientListItem, DashboardSummary
from app.shared.enums import RiskProfile
from app.shared.schemas import ERROR_RESPONSES, Page

router = APIRouter(responses=ERROR_RESPONSES)
dashboard_router = APIRouter(responses=ERROR_RESPONSES)


@router.get("", response_model=Page[ClientListItem], summary="Listagem e filtros de clientes")
async def list_clients(
    service: ClientServiceDep,
    user: CurrentUser,
    search: str | None = Query(None, description="Busca textual por nome ou cidade"),
    risk_profile: RiskProfile | None = Query(None, description="Filtro por perfil de suitability"),
    page: int = Query(1, ge=1, description="Número da página (iniciando em 1)"),
    page_size: int = Query(25, ge=1, le=100, description="Quantidade de registros por página"),
) -> Page[ClientListItem]:
    """Retorna lista paginada dos clientes atendidos pelo assessor autenticado."""
    return await service.list_clients(
        advisor_id=user.id,
        search=search,
        risk_profile=risk_profile,
        page=page,
        page_size=page_size,
    )


@router.get(
    "/dashboard/summary",
    response_model=DashboardSummary,
    summary="Resumo do dashboard do assessor (alias)",
)
async def get_clients_dashboard_summary(
    service: ClientServiceDep,
    user: CurrentUser,
) -> DashboardSummary:
    """Métricas de patrimônio e clientes em atenção vinculados ao assessor."""
    return await service.get_dashboard_summary(advisor_id=user.id)


@router.get("/{client_id}", response_model=ClientDetail, summary="Ficha 360º do cliente")
async def get_client_by_id(
    client_id: UUID,
    service: ClientServiceDep,
    user: CurrentUser,
) -> ClientDetail:
    """Retorna cadastro consolidado, perfil de risco e indicadores do cliente."""
    return await service.get_client_by_id(client_id, advisor_id=user.id)


@dashboard_router.get(
    "/summary",
    response_model=DashboardSummary,
    summary="Métricas consolidadas do dashboard do assessor",
)
async def get_dashboard_summary(
    service: ClientServiceDep,
    user: CurrentUser,
) -> DashboardSummary:
    """Retorna total de AuC, clientes sob atenção, alertas e lista de prioridades imediatas."""
    return await service.get_dashboard_summary(advisor_id=user.id)
