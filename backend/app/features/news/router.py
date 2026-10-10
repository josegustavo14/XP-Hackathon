"""Contrato HTTP da feature news. Notícias e impacto nos clientes.

Montado em `/api/v1/news` por `app.main`.
"""

from uuid import UUID

from fastapi import APIRouter, Query

from app.features.auth.dependencies import AuthServiceDep, CurrentUser
from app.features.news.dependencies import NewsServiceDep
from app.features.news.schemas import (
    NewsListResponse,
    NewsSummary,
    NewsSummaryPeriod,
    NewsSummaryRequest,
)
from app.shared.pagination import Pagination
from app.shared.schemas import ERROR_RESPONSES

router = APIRouter(responses=ERROR_RESPONSES)


@router.get(
    "", response_model=NewsListResponse, summary="Listar notícias de inteligência de mercado"
)
async def list_news(
    service: NewsServiceDep,
    user: CurrentUser,
    pagination: Pagination,
    auth_service: AuthServiceDep,
    period: NewsSummaryPeriod = Query(NewsSummaryPeriod.DAY),
    client_id: UUID | None = Query(None),
    topic: str | None = Query(None, min_length=1, max_length=100),
) -> NewsListResponse:
    """Lista notícias no período; o cliente, quando informado, vem da autenticação."""
    if client_id is not None:
        await auth_service.ensure_client_access(user.id, client_id)
    return await service.list_feed(
        period=period,
        client_id=client_id,
        topic=topic,
        page=pagination.page,
        page_size=pagination.page_size,
    )


@router.get("/summary", response_model=NewsSummary, summary="Resumo agregado de notícias")
async def get_news_summary(
    service: NewsServiceDep,
    user: CurrentUser,
    period: NewsSummaryPeriod = Query(NewsSummaryPeriod.DAY),
) -> NewsSummary:
    """Retorna o resumo diário ou semanal sem exigir campo de período persistido."""
    del user
    return await service.get_summary(period=period)


@router.post("/summaries/{period}", response_model=NewsSummary)
async def summarize_news(
    period: NewsSummaryPeriod,
    payload: NewsSummaryRequest,
    service: NewsServiceDep,
    user: CurrentUser,
) -> NewsSummary:
    """Retorna conteúdo extrativo e referências aos artigos informados.

    A autenticação protege a funcionalidade; o assessor nunca é recebido no
    payload. A consulta dos artigos persistidos e o provedor LLM continuam em
    aberto até a definição de suas respectivas integrações.
    """
    """Gera um resumo estritamente rastreável aos artigos enviados."""
    del user
    return await service.summarize(period=period, articles=payload.articles)
