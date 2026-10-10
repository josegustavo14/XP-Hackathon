"""Mapeamento da tabela ``news_articles``.

O conteúdo integral não é persistido: somente metadados, resumo e hashes para
deduplicação, conforme os limites de uso das fontes de notícia.
"""

from datetime import datetime
from decimal import Decimal
from uuid import UUID

from sqlalchemy import DateTime, ForeignKey, Numeric, SmallInteger, Text, text
from sqlalchemy.dialects.postgresql import ARRAY, JSONB
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.shared.enums import AssetClass, NewsMatchType
from app.shared.models import Base, pg_enum


class NewsArticle(Base):
    __tablename__ = "news_articles"

    id: Mapped[UUID] = mapped_column(primary_key=True, server_default=text("gen_random_uuid()"))
    external_id: Mapped[str | None] = mapped_column(Text)
    source: Mapped[str] = mapped_column(Text)
    url: Mapped[str] = mapped_column(Text, unique=True)
    title: Mapped[str] = mapped_column(Text)
    summary: Mapped[str | None] = mapped_column(Text)
    published_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    collected_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=text("now()")
    )
    topics: Mapped[list[str]] = mapped_column(ARRAY(Text), server_default=text("'{}'"))
    tickers: Mapped[list[str]] = mapped_column(ARRAY(Text), server_default=text("'{}'"))
    issuer_ids: Mapped[list[UUID]] = mapped_column(
        ARRAY(PG_UUID(as_uuid=True)), server_default=text("'{}'")
    )
    asset_classes: Mapped[list[AssetClass]] = mapped_column(
        ARRAY(pg_enum(AssetClass, "asset_class")), server_default=text("'{}'")
    )
    title_hash: Mapped[str] = mapped_column(Text)
    content_hash: Mapped[str] = mapped_column(Text)


class NewsClientImpact(Base):
    """Relevância potencial calculada para uma notícia e carteira.

    ``relevance`` é armazenada em percentagem por compatibilidade com o schema;
    o domínio expõe sempre uma pontuação normalizada entre zero e um.
    """

    __tablename__ = "news_client_impacts"

    id: Mapped[UUID] = mapped_column(primary_key=True, server_default=text("gen_random_uuid()"))
    news_id: Mapped[UUID] = mapped_column(ForeignKey("news_articles.id", ondelete="CASCADE"))
    client_id: Mapped[UUID] = mapped_column(ForeignKey("clients.id", ondelete="CASCADE"))
    match_type: Mapped[NewsMatchType] = mapped_column(pg_enum(NewsMatchType, "news_match_type"))
    exposure_value: Mapped[Decimal | None] = mapped_column(Numeric(18, 2))
    exposure_pct: Mapped[Decimal | None] = mapped_column(Numeric(7, 4))
    matched: Mapped[list[dict[str, object]]] = mapped_column(JSONB, server_default=text("'[]'"))
    relevance: Mapped[int | None] = mapped_column(SmallInteger)
    explanation: Mapped[str | None] = mapped_column(Text)
