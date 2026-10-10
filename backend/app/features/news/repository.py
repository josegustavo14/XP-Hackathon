"""Persistência da feature news. Retorna models/tipos de domínio, nunca Response HTTP."""

from datetime import UTC, datetime
from decimal import Decimal
from uuid import UUID

from sqlalchemy import select, update
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.features.news.models import NewsArticle, NewsClientImpact, NewsRefreshRun, NewsSummaryCache
from app.features.news.schemas import NewsSummary
from app.shared.enums import NewsMatchType


class NewsRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def find_by_url(self, url: str) -> NewsArticle | None:
        return await self.session.scalar(select(NewsArticle).where(NewsArticle.url == url))

    async def find_by_external_id(self, *, source: str, external_id: str) -> NewsArticle | None:
        return await self.session.scalar(
            select(NewsArticle).where(
                NewsArticle.source == source, NewsArticle.external_id == external_id
            )
        )

    async def find_by_title_hash(self, *, source: str, title_hash: str) -> NewsArticle | None:
        return await self.session.scalar(
            select(NewsArticle).where(
                NewsArticle.source == source, NewsArticle.title_hash == title_hash
            )
        )

    async def find_by_content_hash(self, content_hash: str) -> NewsArticle | None:
        return await self.session.scalar(
            select(NewsArticle).where(NewsArticle.content_hash == content_hash)
        )

    async def create(self, **values: object) -> NewsArticle:
        article = NewsArticle(**values)
        self.session.add(article)
        await self.session.flush()
        return article

    async def mark_recollected(
        self, article_id: object, *, collected_at: datetime, summary: str | None, content_hash: str
    ) -> None:
        """Atualiza somente metadados seguros ao reconhecer uma recoleta."""
        await self.session.execute(
            update(NewsArticle)
            .where(NewsArticle.id == article_id)
            .values(collected_at=collected_at, summary=summary, content_hash=content_hash)
        )

    async def upsert_client_impact(
        self,
        *,
        news_id: UUID,
        client_id: UUID,
        match_type: NewsMatchType,
        exposure_value: Decimal,
        exposure_pct: Decimal,
        matched: list[dict[str, object]],
        relevance: int,
        explanation: str,
    ) -> None:
        """Persiste uma avaliação sem modificar a decisão do assessor (``status``)."""
        statement = insert(NewsClientImpact).values(
            news_id=news_id,
            client_id=client_id,
            match_type=match_type,
            exposure_value=exposure_value,
            exposure_pct=exposure_pct,
            matched=matched,
            relevance=relevance,
            explanation=explanation,
        )
        await self.session.execute(
            statement.on_conflict_do_update(
                index_elements=[NewsClientImpact.news_id, NewsClientImpact.client_id],
                set_={
                    "match_type": statement.excluded.match_type,
                    "exposure_value": statement.excluded.exposure_value,
                    "exposure_pct": statement.excluded.exposure_pct,
                    "matched": statement.excluded.matched,
                    "relevance": statement.excluded.relevance,
                    "explanation": statement.excluded.explanation,
                },
            )
        )


class NewsRefreshRepository:
    """Coordena execuções do job sem depender do mecanismo de agendamento."""

    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def claim_window(self, *, window_start: datetime, window_end: datetime) -> UUID | None:
        """Reserva uma janela; concluídas não voltam a ser processadas."""
        started_at = datetime.now(UTC)
        statement = insert(NewsRefreshRun).values(
            window_start=window_start,
            window_end=window_end,
            status="running",
            started_at=started_at,
        )
        result = await self.session.execute(
            statement.on_conflict_do_update(
                index_elements=[NewsRefreshRun.window_start, NewsRefreshRun.window_end],
                set_={
                    "status": "running",
                    "error": None,
                    "started_at": started_at,
                    "finished_at": None,
                },
                where=NewsRefreshRun.status == "failed",
            ).returning(NewsRefreshRun.id)
        )
        return result.scalar_one_or_none()

    async def complete(self, run_id: UUID, *, finished_at: datetime) -> None:
        await self.session.execute(
            update(NewsRefreshRun)
            .where(NewsRefreshRun.id == run_id)
            .values(status="completed", finished_at=finished_at)
        )

    async def store_summary(
        self, summary: NewsSummary, *, window_start: datetime, window_end: datetime
    ) -> None:
        statement = insert(NewsSummaryCache).values(
            period=summary.period.value,
            window_start=window_start,
            window_end=window_end,
            summary=summary.summary,
            highlights=[highlight.model_dump(mode="json") for highlight in summary.highlights],
            generated_at=summary.generated_at,
        )
        await self.session.execute(
            statement.on_conflict_do_update(
                index_elements=[
                    NewsSummaryCache.period,
                    NewsSummaryCache.window_start,
                    NewsSummaryCache.window_end,
                ],
                set_={
                    "summary": statement.excluded.summary,
                    "highlights": statement.excluded.highlights,
                    "generated_at": statement.excluded.generated_at,
                },
            )
        )

    async def fail(self, run_id: UUID, *, error: str, finished_at: datetime) -> None:
        await self.session.execute(
            update(NewsRefreshRun)
            .where(NewsRefreshRun.id == run_id)
            .values(status="failed", error=error[:1000], finished_at=finished_at)
        )
