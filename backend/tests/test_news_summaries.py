import asyncio
from datetime import UTC, datetime
from uuid import UUID

import pytest
from fastapi.testclient import TestClient

from app.features.auth.dependencies import get_current_user
from app.features.auth.schemas import AuthenticatedUser
from app.features.news.dependencies import get_news_service
from app.features.news.schemas import NewsArticle, NewsSummaryPeriod
from app.features.news.service import NewsService
from app.main import create_app


def test_summary_is_extractive_and_keeps_article_references() -> None:
    article = NewsArticle(
        id=UUID("0199d9ea-8af8-7e7b-b631-3bcb04a8b901"),
        title="Mercado acompanha decisão de juros",
        summary="Banco Central divulga decisão nesta quarta-feira.",
        url="https://example.com/noticias/juros",
        source_name="Agência Exemplo",
        published_at=datetime(2026, 10, 10, 8, tzinfo=UTC),
    )

    result = asyncio.run(
        NewsService().summarize(
            period=NewsSummaryPeriod.DAY,
            articles=[article],
            generated_at=datetime(2026, 10, 10, 12, tzinfo=UTC),
        )
    )

    assert result.period is NewsSummaryPeriod.DAY
    assert result.highlights[0].summary == article.summary
    assert result.highlights[0].article_ids == [article.id]
    assert result.generated_at == datetime(2026, 10, 10, 12, tzinfo=UTC)


def test_summary_uses_title_without_creating_content_when_article_has_no_summary() -> None:
    article = NewsArticle(
        id=UUID("0199d9ea-8af8-7e7b-b631-3bcb04a8b902"),
        title="Setor de fundos divulga indicadores",
        source_name="Agência Exemplo",
    )

    result = asyncio.run(
        NewsService().summarize(period=NewsSummaryPeriod.WEEK, articles=[article])
    )

    assert result.highlights[0].summary == article.title
    assert result.highlights[0].article_ids == [article.id]


@pytest.fixture
def authenticated_news_client() -> TestClient:
    app = create_app()
    user = AuthenticatedUser(
        id=UUID("0199d9ea-8af8-7e7b-b631-3bcb04a8b680"),
        email="assessor@demo.xpcopilot.dev",
        claims={"sub": "0199d9ea-8af8-7e7b-b631-3bcb04a8b680"},
    )
    app.dependency_overrides[get_current_user] = lambda: user
    app.dependency_overrides[get_news_service] = NewsService

    with TestClient(app) as test_client:
        yield test_client


def test_daily_summary_endpoint_exposes_the_contract(authenticated_news_client: TestClient) -> None:
    response = authenticated_news_client.post(
        "/api/v1/news/summaries/day",
        json={
            "articles": [
                {
                    "id": "0199d9ea-8af8-7e7b-b631-3bcb04a8b901",
                    "title": "Mercado acompanha decisão de juros",
                    "summary": "Banco Central divulga decisão nesta quarta-feira.",
                    "url": "https://example.com/noticias/juros",
                    "source_name": "Agência Exemplo",
                    "published_at": "2026-10-10T08:00:00Z",
                }
            ]
        },
    )

    assert response.status_code == 200
    data = response.json()
    assert data["period"] == "day"
    assert data["highlights"][0]["article_ids"] == [
        "0199d9ea-8af8-7e7b-b631-3bcb04a8b901"
    ]
    assert data["highlights"][0]["summary"] == "Banco Central divulga decisão nesta quarta-feira."


def test_summary_endpoint_requires_authentication(client: TestClient) -> None:
    response = client.post("/api/v1/news/summaries/week", json={"articles": []})
    assert response.status_code == 401
