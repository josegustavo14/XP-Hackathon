import asyncio
from datetime import UTC, datetime
from types import SimpleNamespace

from app.features.news.schemas import CollectedNewsArticle
from app.features.news.service import NewsService, normalize_news_article


class FakeNewsRepository:
    def __init__(self, matches: dict[str, object] | None = None) -> None:
        self.matches = matches or {}
        self.calls: list[str] = []
        self.recollected: object | None = None

    async def find_by_url(self, url: str) -> object | None:
        self.calls.append("canonical_url")
        return self.matches.get("canonical_url")

    async def find_by_external_id(self, **_: str) -> object | None:
        self.calls.append("external_id")
        return self.matches.get("external_id")

    async def find_by_title_hash(self, **_: str) -> object | None:
        self.calls.append("title_source_hash")
        return self.matches.get("title_source_hash")

    async def find_by_content_hash(self, _: str) -> object | None:
        self.calls.append("content_hash")
        return self.matches.get("content_hash")

    async def mark_recollected(self, article_id: object, **_: object) -> None:
        self.recollected = article_id

    async def create(self, **_: object) -> object:
        return SimpleNamespace(id="new-article")


def _article(**changes: object) -> CollectedNewsArticle:
    values = {
        "source": "Agência Exemplo",
        "title": "  Mercado acompanha juros  ",
        "url": "HTTPS://example.com/noticia/?utm_source=feed&b=2&a=1#topo",
        "content": "Texto que não deve ser persistido.",
    }
    values.update(changes)
    return CollectedNewsArticle(**values)


def test_normalizes_url_text_topics_and_hashes_without_exposing_content() -> None:
    normalized = normalize_news_article(
        _article(topics=[" Juros ", "juros", "Inflação"]),
        collected_at=datetime(2026, 10, 10, tzinfo=UTC),
    )

    assert normalized.url == "https://example.com/noticia?a=1&b=2"
    assert normalized.source == "agência exemplo"
    assert normalized.title == "Mercado acompanha juros"
    assert normalized.topics == ["juros", "inflação"]
    assert normalized.content_hash
    assert "Texto que não deve" not in repr(normalized)


def test_deduplicates_using_the_contractual_order() -> None:
    existing = SimpleNamespace(id="existing-article")
    repository = FakeNewsRepository({"title_source_hash": existing, "content_hash": existing})

    result = asyncio.run(
        NewsService(repository).ingest(_article(external_id="vendor-123"))  # type: ignore[arg-type]
    )

    assert result.created is False
    assert result.article_id == "existing-article"
    assert result.deduplicated_by == "title_source_hash"
    assert repository.calls == ["canonical_url", "external_id", "title_source_hash"]
    assert repository.recollected == "existing-article"
