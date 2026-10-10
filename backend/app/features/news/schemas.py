"""Contratos para notícias e seus resumos.

O ``schema.sql`` ainda não define persistência para notícias. Estes schemas
representam a entrada da sumarização; o repositório de artigos será definido
quando essa persistência existir.
"""

from datetime import datetime
from enum import StrEnum
from uuid import UUID

from pydantic import Field

from app.shared.schemas import ApiModel


class NewsSummaryPeriod(StrEnum):
    """Janela editorial suportada pelo contrato de sumarização."""

    DAY = "day"
    WEEK = "week"


class NewsArticle(ApiModel):
    """Artigo já coletado, com o vínculo necessário à fonte original."""

    id: UUID
    title: str = Field(min_length=1)
    summary: str | None = None
    url: str | None = Field(default=None, pattern=r"^https://")
    source_name: str = Field(min_length=1)
    published_at: datetime | None = None


class NewsSummaryRequest(ApiModel):
    """Entrada explícita para evitar que o sumarizador acesse fontes externas."""

    articles: list[NewsArticle]


class NewsHighlight(ApiModel):
    """Destaque vinculado a um ou mais artigos de origem."""

    title: str
    summary: str
    article_ids: list[UUID] = Field(min_length=1)


class NewsSummary(ApiModel):
    """Resumo de notícias consumível pela tela diária ou semanal."""

    period: NewsSummaryPeriod
    summary: str
    highlights: list[NewsHighlight]
    generated_at: datetime
