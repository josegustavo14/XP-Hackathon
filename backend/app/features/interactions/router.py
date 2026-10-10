"""Contrato HTTP da feature interactions (EP04).

Montado em `/api/v1/interactions` por `app.main`.
"""

from uuid import UUID

from fastapi import APIRouter, Query, status

from app.features.auth.dependencies import CurrentUser
from app.features.interactions.dependencies import InteractionServiceDep
from app.features.interactions.schemas import (
    GoalRead,
    GoalUpdate,
    InteractionCreate,
    InteractionRead,
    InteractionSearchItem,
)
from app.shared.schemas import ERROR_RESPONSES, Page

router = APIRouter(responses=ERROR_RESPONSES)


@router.get("", response_model=Page[InteractionRead], summary="Listar atendimentos do assessor")
async def list_interactions(
    service: InteractionServiceDep,
    user: CurrentUser,
    client_id: UUID | None = Query(None, description="Filtro opcional por ID do cliente"),
    search: str | None = Query(None, description="Busca textual na pauta ou decisões"),
    page: int = Query(1, ge=1, description="Número da página"),
    page_size: int = Query(25, ge=1, le=100, description="Tamanho da página"),
) -> Page[InteractionRead]:
    """Retorna lista paginada dos atendimentos históricos registrados pelo assessor."""
    return await service.list_interactions(
        advisor_id=user.id,
        client_id=client_id,
        search=search,
        page=page,
        page_size=page_size,
    )


@router.post(
    "",
    response_model=InteractionRead,
    status_code=status.HTTP_201_CREATED,
    summary="Registrar novo atendimento",
)
async def create_interaction(
    payload: InteractionCreate,
    service: InteractionServiceDep,
    user: CurrentUser,
) -> InteractionRead:
    """Registra uma reunião, ligação ou conversa com deliberações e pendências."""
    return await service.create_interaction(advisor_id=user.id, payload=payload)


@router.get(
    "/search",
    response_model=list[InteractionSearchItem],
    summary="Busca semântica e textual em atendimentos",
)
async def search_interactions(
    service: InteractionServiceDep,
    user: CurrentUser,
    q: str = Query(..., min_length=1, description="Termos de busca ou tema pesquisado"),
    client_id: UUID | None = Query(None, description="Restringir ao cliente especificado"),
    limit: int = Query(10, ge=1, le=50, description="Limite máximo de resultados"),
) -> list[InteractionSearchItem]:
    """Busca contextual em memórias passadas para alimentar o copiloto e briefings."""
    return await service.search_interactions(
        advisor_id=user.id,
        query=q,
        client_id=client_id,
        limit=limit,
    )


@router.get(
    "/{interaction_id}",
    response_model=InteractionRead,
    summary="Detalhes de um atendimento",
)
async def get_interaction_by_id(
    interaction_id: UUID,
    service: InteractionServiceDep,
    user: CurrentUser,
) -> InteractionRead:
    """Retorna ficha completa de um atendimento com pendências associadas."""
    return await service.get_interaction_by_id(interaction_id=interaction_id, advisor_id=user.id)


goals_router = APIRouter(responses=ERROR_RESPONSES)


@goals_router.get(
    "/{goal_id}",
    response_model=GoalRead,
    summary="Consultar objetivo por ID",
)
async def get_goal_by_id(
    goal_id: UUID,
    service: InteractionServiceDep,
    user: CurrentUser,
) -> GoalRead:
    """Retorna detalhes de um objetivo financeiro cadastrado."""
    return await service.get_goal_by_id(goal_id=goal_id, advisor_id=user.id)


@goals_router.patch(
    "/{goal_id}",
    response_model=GoalRead,
    summary="Atualizar objetivo financeiro",
)
async def update_goal(
    goal_id: UUID,
    payload: GoalUpdate,
    service: InteractionServiceDep,
    user: CurrentUser,
) -> GoalRead:
    """Atualiza título, valor, prazo ou status do objetivo (active, achieved, cancelled)."""
    return await service.update_goal(goal_id=goal_id, advisor_id=user.id, payload=payload)


@goals_router.delete(
    "/{goal_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Remover objetivo financeiro",
)
async def delete_goal(
    goal_id: UUID,
    service: InteractionServiceDep,
    user: CurrentUser,
) -> None:
    """Exclui o objetivo especificado."""
    await service.delete_goal(goal_id=goal_id, advisor_id=user.id)
