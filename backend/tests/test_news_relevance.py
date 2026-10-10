import asyncio
from uuid import UUID

from app.features.news.schemas import (
    ActiveAlertContext,
    ClientHolding,
    ClientPortfolioContext,
    NewsRelevanceArticle,
)
from app.features.news.service import NewsService

NEWS_ID = UUID("0199d9ea-8af8-7e7b-b631-3bcb04a8b901")
CLIENT_ID = UUID("0199d9ea-8af8-7e7b-b631-3bcb04a8b902")
ISSUER_ID = UUID("0199d9ea-8af8-7e7b-b631-3bcb04a8b903")


def _portfolio(*holdings: ClientHolding) -> ClientPortfolioContext:
    return ClientPortfolioContext(client_id=CLIENT_ID, total_value=100_000, holdings=list(holdings))


def test_asset_match_has_explainable_potential_relevance() -> None:
    result = asyncio.run(
        NewsService().assess_relevance(
            article=NewsRelevanceArticle(id=NEWS_ID, tickers=["abcd3"]),
            portfolio=_portfolio(
                ClientHolding(
                    asset_code="ABCD3",
                    issuer_id=ISSUER_ID,
                    asset_class="equities",
                    market_value=25_000,
                )
            ),
        )
    )

    assert result is not None
    assert result.relevance_score == 0.82
    assert "potencialmente relevante" in result.reason
    assert "ABCD3" in result.reason
    assert result.matched_topics == []


def test_topics_can_match_an_explicit_active_alert_without_inventing_an_impact() -> None:
    result = asyncio.run(
        NewsService().assess_relevance(
            article=NewsRelevanceArticle(id=NEWS_ID, topics=["interest_rates"]),
            portfolio=_portfolio(),
            active_alerts=[ActiveAlertContext(topics=["interest_rates"])],
        )
    )

    assert result is not None
    assert result.relevance_score == 0.55
    assert result.matched_topics == ["interest_rates"]
    assert "alerta ativo" in result.reason


def test_unrelated_news_does_not_create_a_relevance_record() -> None:
    result = asyncio.run(
        NewsService().assess_relevance(
            article=NewsRelevanceArticle(id=NEWS_ID, tickers=["OUTRO3"], topics=["inflation"]),
            portfolio=_portfolio(
                ClientHolding(
                    asset_code="ABCD3",
                    asset_class="equities",
                    market_value=10_000,
                )
            ),
        )
    )

    assert result is None


class _FakeRepository:
    def __init__(self) -> None:
        self.values: dict[str, object] | None = None

    async def upsert_client_impact(self, **values: object) -> None:
        self.values = values


def test_persistence_converts_normalized_score_to_database_percentage() -> None:
    repository = _FakeRepository()
    asyncio.run(
        NewsService(repository).assess_relevance(  # type: ignore[arg-type]
            article=NewsRelevanceArticle(id=NEWS_ID, issuer_ids=[ISSUER_ID]),
            portfolio=_portfolio(
                ClientHolding(
                    asset_code="ABCD3",
                    issuer_id=ISSUER_ID,
                    asset_class="equities",
                    market_value=20_000,
                )
            ),
            persist=True,
        )
    )

    assert repository.values is not None
    assert repository.values["relevance"] == 72
    assert repository.values["exposure_pct"] == 0.2
