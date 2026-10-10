"""Persistência da feature news. Retorna models/tipos de domínio, nunca Response HTTP."""

from datetime import datetime
from decimal import Decimal
from uuid import UUID

from sqlalchemy import select, update
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.features.news.models import NewsArticle, NewsClientImpact
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
