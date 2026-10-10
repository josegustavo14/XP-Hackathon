import asyncio
from datetime import UTC, datetime, timedelta
from types import SimpleNamespace
from uuid import UUID

from app.features.news.refresh import NewsRefreshJob, NewsRefreshWindow
from app.features.news.schemas import CollectedNewsArticle
from app.features.news.service import NewsService

RUN_ID = UUID("0199d9ea-8af8-7e7b-b631-3bcb04a8b904")
ARTICLE_ID = UUID("0199d9ea-8af8-7e7b-b631-3bcb04a8b905")
WINDOW = NewsRefreshWindow(
    start=datetime(2026, 10, 10, 10, tzinfo=UTC),
    end=datetime(2026, 10, 10, 11, tzinfo=UTC),
)


class _Runs:
    def __init__(self, claims: list[UUID | None]) -> None:
        self.claims = claims
        self.completed: list[UUID] = []
        self.failed: list[UUID] = []
        self.summaries: list[object] = []

    async def claim_window(self, **_: object) -> UUID | None:
        return self.claims.pop(0)

    async def complete(self, run_id: UUID, **_: object) -> None:
        self.completed.append(run_id)

    async def store_summary(self, summary: object, **_: object) -> None:
        self.summaries.append(summary)

    async def fail(self, run_id: UUID, **_: object) -> None:
        self.failed.append(run_id)


class _NewsRepository:
    async def find_by_url(self, _: str) -> None:
        return None

    async def find_by_external_id(self, **_: str) -> None:
        return None

    async def find_by_title_hash(self, **_: str) -> None:
        return None

    async def find_by_content_hash(self, _: str) -> None:
        return None

    async def create(self, **_: object) -> object:
        return SimpleNamespace(id=ARTICLE_ID)


class _Collector:
    def __init__(self, items: list[CollectedNewsArticle]) -> None:
        self.items = items
        self.calls = 0

    async def collect(self, _: datetime) -> list[CollectedNewsArticle]:
        self.calls += 1
        return self.items


def _article() -> CollectedNewsArticle:
    return CollectedNewsArticle(
        source="Fonte de teste",
        title="Juros acompanham mercado",
        summary="Resumo de teste.",
        url="https://example.test/juros",
        topics=["interest_rates"],
    )


def test_refresh_claims_and_completes_window_once() -> None:
    collector = _Collector([_article()])
    runs = _Runs([RUN_ID, None])
    job = NewsRefreshJob(
        collector=collector, news_service=NewsService(_NewsRepository()), runs=runs  # type: ignore[arg-type]
    )

    first = asyncio.run(job.run(WINDOW))
    second = asyncio.run(job.run(WINDOW))

    assert first.skipped is False
    assert first.collected == 1
    assert first.created == 1
    assert len(first.summaries) == 2
    assert second.skipped is True
    assert collector.calls == 1
    assert runs.completed == [RUN_ID]
    assert len(runs.summaries) == 2


def test_refresh_rejects_invalid_window() -> None:
    now = datetime(2026, 10, 10, tzinfo=UTC)

    try:
        NewsRefreshWindow(start=now, end=now - timedelta(seconds=1))
    except ValueError as error:
        assert "fim da janela" in str(error)
    else:
        raise AssertionError("A janela inválida deveria ser rejeitada.")


def test_refresh_accepts_raw_item_from_adapter_without_persisting_raw_text() -> None:
    raw_item = SimpleNamespace(
        external_id="source-1",
        title="Notícia da fonte",
        url="https://example.test/raw",
        source="Fonte de teste",
        published_at=None,
        raw_text="Texto entregue pelo adapter.",
    )

    items, failures = NewsRefreshJob._collection_items([raw_item])

    assert failures == []
    assert items[0].content == "Texto entregue pelo adapter."
