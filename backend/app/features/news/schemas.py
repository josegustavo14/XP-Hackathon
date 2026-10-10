"""Contratos internos de coleta, sumarização e relevância de notícias.

Os tipos de relevância não são contratos HTTP: a consulta pública fica para a
issue #49. Eles permitem testar e executar as regras sem acoplar a feature a
um provedor de IA ou a uma fonte externa.
"""

from datetime import datetime
from enum import StrEnum
from uuid import UUID

from pydantic import Field

from app.shared.schemas import ApiModel


class CollectedNewsArticle(ApiModel):
    """Metadados vindos de uma fonte, sem reter o texto integral no banco."""

    external_id: str | None = None
    title: str = Field(min_length=1)
    summary: str | None = None
    source: str = Field(min_length=1)
    url: str = Field(min_length=1)
    published_at: datetime | None = None
    topics: list[str] = Field(default_factory=list)
    tickers: list[str] = Field(default_factory=list)
    issuer_ids: list[UUID] = Field(default_factory=list)
    asset_classes: list[str] = Field(default_factory=list)
    content: str | None = None


class NewsSummaryPeriod(StrEnum):
    DAY = "day"
    WEEK = "week"


class NewsArticle(ApiModel):
    """Artigo já coletado para sumarização, com vínculo com a fonte."""

    id: UUID
    title: str = Field(min_length=1)
    summary: str | None = None
    url: str | None = Field(default=None, pattern=r"^https://")
    source_name: str = Field(min_length=1)
    published_at: datetime | None = None


class NewsSummaryRequest(ApiModel):
    articles: list[NewsArticle]


class NewsHighlight(ApiModel):
    title: str
    summary: str
    article_ids: list[UUID] = Field(min_length=1)


class NewsSummary(ApiModel):
    period: NewsSummaryPeriod
    summary: str
    highlights: list[NewsHighlight]
    generated_at: datetime


class NewsRelevanceArticle(ApiModel):
    """Metadados classificados usados pelas regras determinísticas do MVP."""

    id: UUID
    topics: list[str] = Field(default_factory=list)
    tickers: list[str] = Field(default_factory=list)
    issuer_ids: list[UUID] = Field(default_factory=list)
    asset_classes: list[str] = Field(default_factory=list)


class ClientHolding(ApiModel):
    asset_code: str
    issuer_id: UUID | None = None
    asset_class: str
    market_value: float = Field(ge=0)


class ClientPortfolioContext(ApiModel):
    client_id: UUID
    total_value: float = Field(gt=0)
    holdings: list[ClientHolding] = Field(default_factory=list)


class ActiveAlertContext(ApiModel):
    """Tema explícito de um alerta ativo; não infere temas do texto do alerta."""

    topics: list[str] = Field(default_factory=list)


class NewsRelevance(ApiModel):
    news_id: UUID
    client_id: UUID
    relevance_score: float = Field(ge=0, le=1)
    reason: str
    matched_topics: list[str] = Field(default_factory=list)
