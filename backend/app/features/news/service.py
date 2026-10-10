"""Sumarização segura de notícias sem dependência de um LLM específico."""

from datetime import UTC, datetime

from app.features.news.schemas import (
    NewsArticle,
    NewsHighlight,
    NewsSummary,
    NewsSummaryPeriod,
)


class NewsService:
    """Gera um resumo extrativo enquanto o provedor LLM permanece em aberto.

    Cada destaque copia exclusivamente o resumo recebido do artigo (ou seu
    título quando não há resumo). Assim, o serviço não cria fatos,
    interpretações ou recomendações financeiras. Um futuro adaptador de LLM
    deverá preservar esta mesma rastreabilidade por ``article_ids``.
    """

    async def summarize(
        self,
        *,
        period: NewsSummaryPeriod,
        articles: list[NewsArticle],
        generated_at: datetime | None = None,
    ) -> NewsSummary:
        highlights = [
            NewsHighlight(
                title=article.title,
                summary=article.summary or article.title,
                article_ids=[article.id],
            )
            for article in articles
        ]

        return NewsSummary(
            period=period,
            summary=self._overview(articles),
            highlights=highlights,
            generated_at=generated_at or datetime.now(UTC),
        )

    @staticmethod
    def _overview(articles: list[NewsArticle]) -> str:
        if not articles:
            return "Nenhuma notícia foi fornecida para este período."
        return "Destaques extraídos exclusivamente das fontes fornecidas."
