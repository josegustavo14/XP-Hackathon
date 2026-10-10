"""Regras de negócio da feature interactions (EP04)."""

from uuid import UUID

from app.features.interactions.repository import InteractionRepository
from app.features.interactions.schemas import (
    ActionItemRead,
    GoalCreate,
    GoalRead,
    GoalUpdate,
    InteractionCreate,
    InteractionRead,
    InteractionSearchItem,
)
from app.shared.enums import GoalStatus
from app.shared.exceptions import NotFoundError
from app.shared.schemas import Page, PageMeta


class InteractionService:
    def __init__(self, repository: InteractionRepository) -> None:
        self.repository = repository

    async def create_interaction(
        self,
        advisor_id: UUID,
        payload: InteractionCreate,
    ) -> InteractionRead:
        """Registra novo atendimento com deliberações e pendências."""
        interaction = await self.repository.create_interaction(advisor_id, payload)
        action_items_map = await self.repository.get_action_items_by_interaction_ids(
            [interaction.id]
        )
        actions = [
            ActionItemRead.model_validate(it) for it in action_items_map.get(interaction.id, [])
        ]

        read_data = InteractionRead.model_validate(interaction)
        read_data.action_items = actions
        return read_data

    async def list_interactions(
        self,
        advisor_id: UUID,
        *,
        client_id: UUID | None = None,
        search: str | None = None,
        page: int = 1,
        page_size: int = 25,
    ) -> Page[InteractionRead]:
        """Consulta paginada de histórico de relacionamento."""
        interactions, total = await self.repository.list_interactions(
            advisor_id,
            client_id=client_id,
            search=search,
            page=page,
            page_size=page_size,
        )

        interaction_ids = [it.id for it in interactions]
        action_items_map = await self.repository.get_action_items_by_interaction_ids(
            interaction_ids
        )

        items: list[InteractionRead] = []
        for it in interactions:
            read_item = InteractionRead.model_validate(it)
            read_item.action_items = [
                ActionItemRead.model_validate(act) for act in action_items_map.get(it.id, [])
            ]
            items.append(read_item)

        return Page(
            items=items,
            meta=PageMeta.build(page=page, page_size=page_size, total=total),
        )

    async def get_interaction_by_id(
        self,
        interaction_id: UUID,
        advisor_id: UUID,
    ) -> InteractionRead:
        """Obtém detalhes de um atendimento específico."""
        interaction = await self.repository.get_interaction_by_id(interaction_id, advisor_id)
        if not interaction:
            raise NotFoundError(
                "Registro de atendimento não encontrado.",
                code="INTERACTION_NOT_FOUND",
            )

        action_items_map = await self.repository.get_action_items_by_interaction_ids(
            [interaction.id]
        )
        read_item = InteractionRead.model_validate(interaction)
        read_item.action_items = [
            ActionItemRead.model_validate(act) for act in action_items_map.get(interaction.id, [])
        ]
        return read_item

    async def search_interactions(
        self,
        advisor_id: UUID,
        query: str,
        *,
        client_id: UUID | None = None,
        limit: int = 10,
    ) -> list[InteractionSearchItem]:
        """Busca semântica/textual de atendimentos para o copiloto e histórico."""
        results = await self.repository.search_interactions(
            advisor_id,
            query=query,
            client_id=client_id,
            limit=limit,
        )

        interaction_ids = [it.id for it, _ in results]
        action_items_map = await self.repository.get_action_items_by_interaction_ids(
            interaction_ids
        )

        search_items: list[InteractionSearchItem] = []
        for it, score in results:
            read_item = InteractionRead.model_validate(it)
            read_item.action_items = [
                ActionItemRead.model_validate(act) for act in action_items_map.get(it.id, [])
            ]
            search_items.append(InteractionSearchItem(interaction=read_item, score=score))

        return search_items

    async def create_goal(
        self,
        advisor_id: UUID,
        client_id: UUID,
        payload: GoalCreate,
    ) -> GoalRead:
        """Cadastra um objetivo ou meta financeira para o cliente."""
        goal = await self.repository.create_goal(advisor_id, client_id, payload)
        return GoalRead.model_validate(goal)

    async def list_goals(
        self,
        advisor_id: UUID,
        client_id: UUID,
        status: GoalStatus | None = None,
    ) -> list[GoalRead]:
        """Lista objetivos do cliente filtrando opcionalmente por status."""
        goals = await self.repository.list_goals(advisor_id, client_id, status=status)
        return [GoalRead.model_validate(g) for g in goals]

    async def get_goal_by_id(
        self,
        goal_id: UUID,
        advisor_id: UUID,
    ) -> GoalRead:
        """Obtém detalhes de um objetivo por ID."""
        goal = await self.repository.get_goal_by_id(goal_id, advisor_id)
        if not goal:
            raise NotFoundError("Objetivo financeiro não encontrado.", code="GOAL_NOT_FOUND")
        return GoalRead.model_validate(goal)

    async def update_goal(
        self,
        goal_id: UUID,
        advisor_id: UUID,
        payload: GoalUpdate,
    ) -> GoalRead:
        """Atualiza dados ou status de um objetivo."""
        goal = await self.repository.update_goal(goal_id, advisor_id, payload)
        if not goal:
            raise NotFoundError("Objetivo financeiro não encontrado.", code="GOAL_NOT_FOUND")
        return GoalRead.model_validate(goal)

    async def delete_goal(
        self,
        goal_id: UUID,
        advisor_id: UUID,
    ) -> None:
        """Exclui um objetivo cadastrado."""
        deleted = await self.repository.delete_goal(goal_id, advisor_id)
        if not deleted:
            raise NotFoundError("Objetivo financeiro não encontrado.", code="GOAL_NOT_FOUND")
