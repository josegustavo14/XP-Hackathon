"""Persistência da feature interactions (EP04). Retorna models/tipos de domínio."""

from datetime import UTC, datetime
from uuid import UUID

from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.features.interactions.models import ActionItem, Goal, Interaction
from app.features.interactions.schemas import (
    ActionItemCreate,
    GoalCreate,
    GoalUpdate,
    InteractionCreate,
)
from app.shared.enums import GoalStatus


class InteractionRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def create_interaction(
        self,
        advisor_id: UUID,
        payload: InteractionCreate,
    ) -> Interaction:
        """Cria e persiste um atendimento e seus itens de ação combinados."""
        occurred = payload.occurred_at or datetime.now(UTC)
        interaction = Interaction(
            client_id=payload.client_id,
            advisor_id=advisor_id,
            channel=payload.channel,
            summary=payload.summary,
            decisions=payload.decisions,
            occurred_at=occurred,
        )
        self.session.add(interaction)
        await self.session.flush()

        for item in payload.action_items:
            action = ActionItem(
                client_id=payload.client_id,
                interaction_id=interaction.id,
                description=item.description,
                due_date=item.due_date,
            )
            self.session.add(action)

        await self.session.commit()
        await self.session.refresh(interaction)
        return interaction

    async def list_interactions(
        self,
        advisor_id: UUID,
        *,
        client_id: UUID | None = None,
        search: str | None = None,
        page: int = 1,
        page_size: int = 25,
    ) -> tuple[list[Interaction], int]:
        """Retorna lista paginada de atendimentos vinculados ao assessor."""
        query = select(Interaction).where(Interaction.advisor_id == advisor_id)

        if client_id is not None:
            query = query.where(Interaction.client_id == client_id)

        if search:
            search_pattern = f"%{search.strip()}%"
            query = query.where(
                or_(
                    Interaction.summary.ilike(search_pattern),
                    Interaction.decisions.ilike(search_pattern),
                )
            )

        # Total
        count_stmt = select(func.count()).select_from(query.subquery())
        total_res = await self.session.execute(count_stmt)
        total = total_res.scalar() or 0

        # Paginação
        offset = (page - 1) * page_size
        stmt = query.order_by(Interaction.occurred_at.desc()).offset(offset).limit(page_size)
        res = await self.session.execute(stmt)
        items = list(res.scalars().all())

        return items, total

    async def get_interaction_by_id(
        self,
        interaction_id: UUID,
        advisor_id: UUID,
    ) -> Interaction | None:
        """Busca um atendimento específico por ID garantindo autorização do assessor."""
        stmt = select(Interaction).where(
            Interaction.id == interaction_id,
            Interaction.advisor_id == advisor_id,
        )
        res = await self.session.execute(stmt)
        return res.scalar_one_or_none()

    async def get_action_items_by_interaction_ids(
        self,
        interaction_ids: list[UUID],
    ) -> dict[UUID, list[ActionItem]]:
        """Busca itens de ação associados às interações para enriquecimento dos schemas."""
        if not interaction_ids:
            return {}

        stmt = (
            select(ActionItem)
            .where(ActionItem.interaction_id.in_(interaction_ids))
            .order_by(ActionItem.created_at.asc())
        )
        res = await self.session.execute(stmt)
        items = res.scalars().all()

        mapping: dict[UUID, list[ActionItem]] = {iid: [] for iid in interaction_ids}
        for item in items:
            if item.interaction_id:
                mapping.setdefault(item.interaction_id, []).append(item)
        return mapping

    async def search_interactions(
        self,
        advisor_id: UUID,
        query: str,
        *,
        client_id: UUID | None = None,
        limit: int = 10,
    ) -> list[tuple[Interaction, float]]:
        """Busca semântica e contextual por similaridade de texto nos registros."""
        search_terms = query.strip().split()
        if not search_terms:
            return []

        stmt = select(Interaction).where(Interaction.advisor_id == advisor_id)
        if client_id is not None:
            stmt = stmt.where(Interaction.client_id == client_id)

        # Filtro de termos
        conditions = [
            or_(
                Interaction.summary.ilike(f"%{term}%"),
                Interaction.decisions.ilike(f"%{term}%"),
            )
            for term in search_terms
        ]
        stmt = stmt.where(or_(*conditions)).order_by(Interaction.occurred_at.desc()).limit(limit)

        res = await self.session.execute(stmt)
        interactions = list(res.scalars().all())

        # Cálculo de pontuação básica de relevância
        results: list[tuple[Interaction, float]] = []
        for it in interactions:
            text_corpus = f"{it.summary} {it.decisions or ''}".lower()
            matched_count = sum(1 for term in search_terms if term.lower() in text_corpus)
            score = round(min(1.0, 0.5 + (0.5 * (matched_count / len(search_terms)))), 2)
            results.append((it, score))

        results.sort(key=lambda x: x[1], reverse=True)
        return results

    async def create_action_item(
        self,
        client_id: UUID,
        payload: ActionItemCreate,
        interaction_id: UUID | None = None,
    ) -> ActionItem:
        """Cria e persiste uma pendência ou item de ação isolado."""
        action = ActionItem(
            client_id=client_id,
            interaction_id=interaction_id,
            description=payload.description,
            due_date=payload.due_date,
        )
        self.session.add(action)
        await self.session.commit()
        await self.session.refresh(action)
        return action

    async def create_goal(
        self,
        advisor_id: UUID,
        client_id: UUID,
        payload: GoalCreate,
    ) -> Goal:
        """Cadastra uma meta ou objetivo financeiro do cliente."""
        goal = Goal(
            advisor_id=advisor_id,
            client_id=client_id,
            title=payload.title,
            target_amount=payload.target_amount,
            target_date=payload.target_date,
            status=GoalStatus.ACTIVE,
            notes=payload.notes,
        )
        self.session.add(goal)
        await self.session.commit()
        await self.session.refresh(goal)
        return goal

    async def list_goals(
        self,
        advisor_id: UUID,
        client_id: UUID,
        status: GoalStatus | None = None,
    ) -> list[Goal]:
        """Lista os objetivos de um cliente vinculados ao assessor."""
        stmt = (
            select(Goal)
            .where(Goal.advisor_id == advisor_id, Goal.client_id == client_id)
            .order_by(Goal.created_at.desc())
        )
        if status is not None:
            stmt = stmt.where(Goal.status == status)

        res = await self.session.execute(stmt)
        return list(res.scalars().all())

    async def get_goal_by_id(
        self,
        goal_id: UUID,
        advisor_id: UUID,
    ) -> Goal | None:
        """Busca um objetivo específico por ID com validação de assessor."""
        stmt = select(Goal).where(Goal.id == goal_id, Goal.advisor_id == advisor_id)
        res = await self.session.execute(stmt)
        return res.scalar_one_or_none()

    async def update_goal(
        self,
        goal_id: UUID,
        advisor_id: UUID,
        payload: GoalUpdate,
    ) -> Goal | None:
        """Atualiza campos de um objetivo existente."""
        goal = await self.get_goal_by_id(goal_id, advisor_id)
        if not goal:
            return None

        if payload.title is not None:
            goal.title = payload.title
        if payload.target_amount is not None:
            goal.target_amount = payload.target_amount
        if payload.target_date is not None:
            goal.target_date = payload.target_date
        if payload.status is not None:
            goal.status = payload.status
        if payload.notes is not None:
            goal.notes = payload.notes

        await self.session.commit()
        await self.session.refresh(goal)
        return goal

    async def delete_goal(
        self,
        goal_id: UUID,
        advisor_id: UUID,
    ) -> bool:
        """Remove um objetivo cadastrado."""
        goal = await self.get_goal_by_id(goal_id, advisor_id)
        if not goal:
            return False

        await self.session.delete(goal)
        await self.session.commit()
        return True
