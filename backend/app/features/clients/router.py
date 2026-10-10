"""Contrato HTTP da feature clients e dashboard do assessor (EP01/EP04)."""

from uuid import UUID

from fastapi import APIRouter, Query

from app.features.auth.dependencies import CurrentUser
from app.features.clients.dependencies import ClientServiceDep
from app.features.clients.schemas import ClientDetail, ClientListItem, DashboardSummary
from app.features.interactions.dependencies import InteractionServiceDep
from app.features.interactions.schemas import (
    GoalCreate,
    GoalRead,
    InteractionCreate,
    InteractionRead,
)
from app.shared.enums import GoalStatus, RiskProfile
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


@router.get(
    "/{client_id}/interactions",
    response_model=Page[InteractionRead],
    summary="Histórico de atendimentos do cliente",
)
async def list_client_interactions(
    client_id: UUID,
    interactions_service: InteractionServiceDep,
    user: CurrentUser,
    search: str | None = Query(None, description="Busca textual na pauta ou decisões"),
    page: int = Query(1, ge=1, description="Número da página"),
    page_size: int = Query(25, ge=1, le=100, description="Tamanho da página"),
) -> Page[InteractionRead]:
    """Retorna a linha do tempo de reuniões e contatos realizados com este cliente."""
    return await interactions_service.list_interactions(
        advisor_id=user.id,
        client_id=client_id,
        search=search,
        page=page,
        page_size=page_size,
    )


@router.post(
    "/{client_id}/interactions",
    response_model=InteractionRead,
    status_code=201,
    summary="Registrar atendimento para o cliente",
)
async def create_client_interaction(
    client_id: UUID,
    payload: InteractionCreate,
    interactions_service: InteractionServiceDep,
    user: CurrentUser,
) -> InteractionRead:
    """Registra uma interação com o cliente garantindo client_id consistente."""
    payload.client_id = client_id
    return await interactions_service.create_interaction(advisor_id=user.id, payload=payload)


@router.get(
    "/{client_id}/goals",
    response_model=list[GoalRead],
    summary="Listar objetivos financeiros do cliente",
)
async def list_client_goals(
    client_id: UUID,
    interactions_service: InteractionServiceDep,
    user: CurrentUser,
    status: GoalStatus | None = Query(None, description="Filtro opcional por status"),
) -> list[GoalRead]:
    """Retorna os objetivos e metas cadastrados para o cliente."""
    return await interactions_service.list_goals(
        advisor_id=user.id,
        client_id=client_id,
        status=status,
    )


@router.post(
    "/{client_id}/goals",
    response_model=GoalRead,
    status_code=201,
    summary="Cadastrar objetivo financeiro para o cliente",
)
async def create_client_goal(
    client_id: UUID,
    payload: GoalCreate,
    interactions_service: InteractionServiceDep,
    user: CurrentUser,
) -> GoalRead:
    """Cadastra um novo objetivo financeiro para o cliente."""
    return await interactions_service.create_goal(
        advisor_id=user.id,
        client_id=client_id,
        payload=payload,
    )


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
