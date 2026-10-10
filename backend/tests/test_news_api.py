import asyncio
from datetime import UTC, datetime
from types import SimpleNamespace
from uuid import UUID
from zoneinfo import ZoneInfo

from app.features.news.repository import NewsFeedRecord
from app.features.news.schemas import NewsSummaryPeriod
from app.features.news.service import NewsService


class FakeNewsRepository:
    def __init__(self, records: list[NewsFeedRecord]) -> None:
        self.records = records
        self.feed_arguments: dict[str, object] | None = None

    async def list_feed(self, **kwargs: object) -> tuple[list[NewsFeedRecord], int]:
        self.feed_arguments = kwargs
        return self.records, len(self.records)

    async def list_for_summary(self, **kwargs: object) -> list[object]:
        return [record.article for record in self.records]


def make_record(with_relevance: bool = False) -> NewsFeedRecord:
    article = SimpleNamespace(
        id=UUID("0199d9ea-8af8-7e7b-b631-3bcb04a8b901"),
        title="Mercado acompanha decisão de juros",
        summary="Banco Central divulga decisão nesta quarta-feira.",
        source="Agência Exemplo",
        url="https://example.com/noticias/juros",
        published_at=datetime(2026, 10, 10, 8, tzinfo=UTC),
        collected_at=datetime(2026, 10, 10, 9, tzinfo=UTC),
        topics=["interest_rates"],
    )
    impact = None
    if with_relevance:
        impact = SimpleNamespace(
            client_id=UUID("0199d9ea-8af8-7e7b-b631-3bcb04a8b680"),
            relevance=82,
            explanation="Exposição do cliente a renda fixa.",
        )
    return NewsFeedRecord(article=article, impact=impact)


def service_with(repository: FakeNewsRepository) -> NewsService:
    service = NewsService()
    service.repository = repository  # type: ignore[assignment]
    return service


def test_list_feed_applies_period_and_returns_relevance_context() -> None:
    repository = FakeNewsRepository([make_record(with_relevance=True)])
    service = service_with(repository)
    client_id = UUID("0199d9ea-8af8-7e7b-b631-3bcb04a8b680")

    result = asyncio.run(
        service.list_feed(
            period=NewsSummaryPeriod.DAY,
            client_id=client_id,
            topic="interest_rates",
            page=1,
            page_size=20,
            now=datetime(2026, 10, 10, 13, tzinfo=UTC),
        )
    )

    assert repository.feed_arguments == {
        "start_at": datetime(2026, 10, 10, 0, tzinfo=ZoneInfo("America/Sao_Paulo")),
        "client_id": client_id,
        "topic": "interest_rates",
        "offset": 0,
        "limit": 20,
    }
    assert result.meta.total == 1
    assert result.updated_at == datetime(2026, 10, 10, 9, tzinfo=UTC)
    assert result.items[0].relevance is not None
    assert result.items[0].relevance.score == 0.82
    assert result.items[0].relevance.reason == "Exposição do cliente a renda fixa."


def test_week_period_starts_on_monday_in_sao_paulo() -> None:
    start = NewsService._period_start(
        NewsSummaryPeriod.WEEK, now=datetime(2026, 10, 10, 13, tzinfo=UTC)
    )

    assert start.isoformat() == "2026-10-05T00:00:00-03:00"


def test_get_summary_reuses_articles_from_the_requested_window() -> None:
    repository = FakeNewsRepository([make_record()])
    result = asyncio.run(
        service_with(repository).get_summary(
            period=NewsSummaryPeriod.WEEK,
            now=datetime(2026, 10, 10, 13, tzinfo=UTC),
        )
    )

    assert result.period is NewsSummaryPeriod.WEEK
    assert result.highlights[0].article_ids == [
        UUID("0199d9ea-8af8-7e7b-b631-3bcb04a8b901")
    ]
    assert result.generated_at == datetime(2026, 10, 10, 13, tzinfo=UTC)
