"""Job de atualização de notícias, independente do mecanismo de agendamento.

Um cron, worker ou comando manual deve construir ``NewsRefreshJob`` e chamar
``run`` com uma janela determinística. O job não é exposto por HTTP, evitando
coleta durante leituras do dashboard.
"""

import logging
from collections.abc import Iterable, Mapping
from dataclasses import dataclass
from datetime import UTC, datetime
from typing import Protocol
from uuid import UUID

from app.features.news.repository import NewsRefreshRepository
from app.features.news.schemas import (
    ActiveAlertContext,
    ClientPortfolioContext,
    CollectedNewsArticle,
    NewsArticle,
    NewsRelevanceArticle,
    NewsSummary,
    NewsSummaryPeriod,
)
from app.features.news.service import NewsService

logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class NewsRefreshWindow:
    start: datetime
    end: datetime

    def __post_init__(self) -> None:
        if self.start.tzinfo is None or self.end.tzinfo is None:
            raise ValueError("A janela de atualização deve usar datas com timezone.")
        if self.end <= self.start:
            raise ValueError("O fim da janela deve ser posterior ao início.")


@dataclass(frozen=True)
class NewsRefreshFailure:
    stage: str
    message: str


@dataclass(frozen=True)
class NewsRefreshResult:
    skipped: bool
    collected: int
    created: int
    deduplicated: int
    relevance_calculated: int
    summaries: list[NewsSummary]
    failures: list[NewsRefreshFailure]


class NewsCollectorPort(Protocol):
    """Compatível com o coletor por adapters da issue #44."""

    async def collect(self, since: datetime) -> object: ...


class ClientContextProvider(Protocol):
    """Obtém somente os contextos necessários para calcular relevância."""

    async def for_article(
        self, article: NewsRelevanceArticle
    ) -> Iterable[tuple[ClientPortfolioContext, list[ActiveAlertContext]]]: ...


class NewsRefreshJob:
    """Executa a cadeia de atualização uma vez por janela persistida."""

    def __init__(
        self,
        *,
        collector: NewsCollectorPort,
        news_service: NewsService,
        runs: NewsRefreshRepository,
        context_provider: ClientContextProvider | None = None,
    ) -> None:
        self.collector = collector
        self.news_service = news_service
        self.runs = runs
        self.context_provider = context_provider

    async def run(self, window: NewsRefreshWindow) -> NewsRefreshResult:
        """Executa coleta e persistência; a mesma janela concluída é ignorada."""
        run_id = await self.runs.claim_window(window_start=window.start, window_end=window.end)
        if run_id is None:
            return NewsRefreshResult(True, 0, 0, 0, 0, [], [])

        try:
            return await self._run_claimed(run_id, window)
        except Exception as error:
            await self.runs.fail(run_id, error=str(error), finished_at=datetime.now(UTC))
            raise

    async def _run_claimed(self, run_id: UUID, window: NewsRefreshWindow) -> NewsRefreshResult:
        output = await self.collector.collect(window.start)
        items, collection_failures = self._collection_items(output)
        failures = [NewsRefreshFailure("collect", message) for message in collection_failures]
        articles: list[NewsArticle] = []
        created = 0
        deduplicated = 0
        relevance_calculated = 0

        for collected in items:
            try:
                ingestion = await self.news_service.ingest(collected)
                created += int(ingestion.created)
                deduplicated += int(not ingestion.created)
                if not isinstance(ingestion.article_id, UUID):
                    continue
                articles.append(
                    NewsArticle(
                        id=ingestion.article_id,
                        title=collected.title,
                        summary=collected.summary,
                        url=collected.url,
                        source_name=collected.source,
                        published_at=collected.published_at,
                    )
                )
                relevance_calculated += await self._calculate_relevance(
                    ingestion.article_id, collected
                )
            except Exception as error:
                logger.warning("News refresh failed while ingesting an item: %s", error)
                failures.append(NewsRefreshFailure("ingest", str(error)))

        summaries = [
            await self.news_service.summarize(
                period=period, articles=articles, generated_at=window.end
            )
            for period in (NewsSummaryPeriod.DAY, NewsSummaryPeriod.WEEK)
        ]
        for summary in summaries:
            await self.runs.store_summary(
                summary, window_start=window.start, window_end=window.end
            )
        await self.runs.complete(run_id, finished_at=datetime.now(UTC))
        return NewsRefreshResult(
            skipped=False,
            collected=len(items),
            created=created,
            deduplicated=deduplicated,
            relevance_calculated=relevance_calculated,
            summaries=summaries,
            failures=failures,
        )

    async def _calculate_relevance(self, article_id: UUID, article: CollectedNewsArticle) -> int:
        if self.context_provider is None:
            return 0
        relevance_article = NewsRelevanceArticle(
            id=article_id,
            topics=article.topics,
            tickers=article.tickers,
            issuer_ids=article.issuer_ids,
            asset_classes=article.asset_classes,
        )
        calculated = 0
        for portfolio, alerts in await self.context_provider.for_article(relevance_article):
            relevance = await self.news_service.assess_relevance(
                article=relevance_article,
                portfolio=portfolio,
                active_alerts=alerts,
                persist=True,
            )
            calculated += int(relevance is not None)
        return calculated

    @staticmethod
    def _collection_items(output: object) -> tuple[list[CollectedNewsArticle], list[str]]:
        """Aceita a lista direta ou o resultado ``items`` do coletor por adapters."""
        raw_items = getattr(output, "items", output)
        raw_failures = getattr(output, "failures", [])
        if not isinstance(raw_items, Iterable):
            raise TypeError("O coletor de notícias deve retornar itens iteráveis.")
        items = [NewsRefreshJob._to_collected_article(item) for item in raw_items]
        failures = [str(getattr(failure, "error", failure)) for failure in raw_failures]
        return items, failures

    @staticmethod
    def _to_collected_article(item: object) -> CollectedNewsArticle:
        if isinstance(item, CollectedNewsArticle):
            return item
        if hasattr(item, "model_dump"):
            values = item.model_dump()  # type: ignore[union-attr]
        elif isinstance(item, Mapping):
            values = dict(item)
        else:
            return CollectedNewsArticle.model_validate(item)
        # O contrato do coletor usa ``raw_text``; o normalizador só o usa para
        # gerar hash e não o persiste como cópia integral do artigo.
        if "raw_text" in values and "content" not in values:
            values["content"] = values.pop("raw_text")
        return CollectedNewsArticle.model_validate(values)
