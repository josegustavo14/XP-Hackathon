"""Contrato HTTP da feature news. Notícias e impacto nos clientes.

Montado em `/api/v1/news` por `app.main`.
"""

from fastapi import APIRouter

from app.features.auth.dependencies import CurrentUser
from app.features.news.dependencies import NewsServiceDep
from app.features.news.schemas import NewsSummary, NewsSummaryPeriod, NewsSummaryRequest
from app.shared.schemas import ERROR_RESPONSES

router = APIRouter(responses=ERROR_RESPONSES)


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
