"""Persistência da feature briefings. Retorna tipos de domínio, nunca Response HTTP.

Lê direto as tabelas de outras features porque os services delas ainda não
expõem essas consultas; trocar pelos services quando existirem.
"""

from dataclasses import dataclass
from datetime import datetime
from decimal import Decimal
from uuid import UUID

from sqlalchemy import func, select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.features.alerts.models import Alert
from app.features.briefings.context import (
    AlertFacts,
    BriefingContext,
    ClientFacts,
    GoalFacts,
    InteractionFacts,
    NewsFacts,
    PendingItemFacts,
)
from app.features.briefings.models import Briefing
from app.features.briefings.schemas import BriefingContent, SourceRef
from app.features.clients.models import Client
from app.features.interactions.models import ActionItem, Goal, Interaction
from app.features.portfolios.models import Asset, Position
from app.shared.enums import AlertStatus, GoalStatus

RECENT_INTERACTIONS = 3
PENDING_ITEMS = 5
RELATED_NEWS = 3


@dataclass(frozen=True, slots=True)
class SavedBriefing:
    id: UUID
    created_at: datetime


class BriefingRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def load_context(
        self, client_id: UUID, *, advisor_id: UUID, meeting_context: str | None
    ) -> BriefingContext | None:
        """Reúne os dados permitidos do cliente; `None` se não existir ou não for do assessor."""
        client = await self._get_client(client_id, advisor_id)
        if client is None:
            return None
        allocation = await self._get_allocation(client_id)
        return BriefingContext(
            client=client,
            portfolio_total=sum(allocation.values(), Decimal("0")),
            allocation=allocation,
            alerts=await self._get_open_alerts(client_id),
            goals=await self._get_active_goals(client_id),
            interactions=await self._get_recent_interactions(client_id),
            pending_items=await self._get_pending_items(client_id),
            news=await self._get_related_news(client_id),
            meeting_context=meeting_context,
        )

    async def save_briefing(
        self,
        *,
        client_id: UUID,
        advisor_id: UUID,
        content: BriefingContent,
        sources: list[SourceRef],
    ) -> SavedBriefing:
        """Grava como rascunho (`draft`): o briefing nunca é enviado ao cliente."""
        briefing = Briefing(
            client_id=client_id,
            advisor_id=advisor_id,
            content=content.model_dump(mode="json"),
            sources=_sources_by_kind(sources),
        )
        self.session.add(briefing)
        # id e created_at voltam no RETURNING do INSERT (eager_defaults)
        await self.session.flush()
        return SavedBriefing(id=briefing.id, created_at=briefing.created_at)

    async def _get_client(self, client_id: UUID, advisor_id: UUID) -> ClientFacts | None:
        stmt = select(Client).where(Client.id == client_id, Client.advisor_id == advisor_id)
        client = (await self.session.execute(stmt)).scalar_one_or_none()
        if client is None:
            return None
        return ClientFacts(
            id=client.id,
            name=client.full_name,
            risk_profile=client.risk_profile,
            investment_horizon_yrs=client.investment_horizon_yrs,
            liquidity_need=client.liquidity_need,
            suitability_expires_at=client.suitability_expires_at,
            last_contact_at=client.last_contact_at,
            updated_at=client.updated_at,
        )

    async def _get_allocation(self, client_id: UUID) -> dict[str, Decimal]:
        stmt = (
            select(Asset.asset_class, func.sum(Position.market_value))
            .join(Asset, Asset.id == Position.asset_id)
            .where(Position.client_id == client_id)
            .group_by(Asset.asset_class)
        )
        rows = (await self.session.execute(stmt)).all()
        return {str(asset_class): value for asset_class, value in rows}

    async def _get_open_alerts(self, client_id: UUID) -> list[AlertFacts]:
        stmt = select(Alert).where(
            Alert.client_id == client_id,
            Alert.status == AlertStatus.OPEN,
            Alert.closed_at.is_(None),
        )
        alerts = (await self.session.execute(stmt)).scalars().all()
        return [
            AlertFacts(
                id=a.id, type=a.type, priority=a.priority, title=a.title, updated_at=a.updated_at
            )
            for a in alerts
        ]

    async def _get_active_goals(self, client_id: UUID) -> list[GoalFacts]:
        stmt = (
            select(Goal)
            .where(Goal.client_id == client_id, Goal.status == GoalStatus.ACTIVE)
            .order_by(Goal.target_date.asc().nulls_last())
        )
        goals = (await self.session.execute(stmt)).scalars().all()
        return [
            GoalFacts(
                id=g.id, title=g.title, target_amount=g.target_amount, target_date=g.target_date
            )
            for g in goals
        ]

    async def _get_recent_interactions(self, client_id: UUID) -> list[InteractionFacts]:
        stmt = (
            select(Interaction)
            .where(Interaction.client_id == client_id)
            .order_by(Interaction.occurred_at.desc())
            .limit(RECENT_INTERACTIONS)
        )
        interactions = (await self.session.execute(stmt)).scalars().all()
        return [
            InteractionFacts(
                id=i.id, occurred_at=i.occurred_at, channel=i.channel, summary=i.summary
            )
            for i in interactions
        ]

    async def _get_pending_items(self, client_id: UUID) -> list[PendingItemFacts]:
        stmt = (
            select(ActionItem)
            .where(ActionItem.client_id == client_id, ActionItem.done_at.is_(None))
            .order_by(ActionItem.due_date.asc().nulls_last())
            .limit(PENDING_ITEMS)
        )
        items = (await self.session.execute(stmt)).scalars().all()
        return [
            PendingItemFacts(id=i.id, description=i.description, due_date=i.due_date) for i in items
        ]

    async def _get_related_news(self, client_id: UUID) -> list[NewsFacts]:
        # Notícias ainda não têm model ORM (ver news/models.py)
        stmt = text("""
            select n.id, n.title, n.published_at, i.explanation
            from news_client_impacts i
            join news_articles n on n.id = i.news_id
            where i.client_id = :client_id and i.status <> 'dismissed'
            order by n.published_at desc
            limit :limit
        """)
        rows = await self.session.execute(stmt, {"client_id": client_id, "limit": RELATED_NEWS})
        return [
            NewsFacts(
                id=r.id, title=r.title, published_at=r.published_at, explanation=r.explanation
            )
            for r in rows
        ]


def _sources_by_kind(sources: list[SourceRef]) -> dict[str, list[str]]:
    """Formato da coluna `briefings.sources`: {"alert_ids": [...], "news_ids": [...], ...}."""
    grouped: dict[str, list[str]] = {}
    for source in sources:
        if source.type != "client":
            grouped.setdefault(f"{source.type}_ids", []).append(str(source.id))
    return grouped
