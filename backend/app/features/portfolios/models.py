from datetime import date, datetime
from decimal import Decimal
from uuid import UUID

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    Date,
    DateTime,
    ForeignKey,
    Numeric,
    SmallInteger,
    Text,
    UniqueConstraint,
    func,
    text,
)
from sqlalchemy.dialects.postgresql import ARRAY
from sqlalchemy.orm import Mapped, mapped_column

from app.shared.enums import AssetClass, ConsentStatus, DataSource, IssuerType
from app.shared.models import Base, pg_enum

_UUID_DEFAULT = text("gen_random_uuid()")


class Institution(Base):
    __tablename__ = "institutions"

    id: Mapped[UUID] = mapped_column(primary_key=True, server_default=_UUID_DEFAULT)
    name: Mapped[str] = mapped_column(Text, unique=True)
    is_xp: Mapped[bool] = mapped_column(Boolean, server_default=text("false"))


class Issuer(Base):
    __tablename__ = "issuers"

    id: Mapped[UUID] = mapped_column(primary_key=True, server_default=_UUID_DEFAULT)
    name: Mapped[str] = mapped_column(Text, unique=True)
    type: Mapped[IssuerType] = mapped_column(pg_enum(IssuerType, "issuer_type"))


class Asset(Base):
    __tablename__ = "assets"
    __table_args__ = (CheckConstraint("risk_level between 1 and 5"),)

    id: Mapped[UUID] = mapped_column(primary_key=True, server_default=_UUID_DEFAULT)
    code: Mapped[str] = mapped_column(Text, unique=True)
    name: Mapped[str] = mapped_column(Text)
    asset_class: Mapped[AssetClass] = mapped_column(pg_enum(AssetClass, "asset_class"))
    issuer_id: Mapped[UUID | None] = mapped_column(ForeignKey("issuers.id"))
    risk_level: Mapped[int] = mapped_column(SmallInteger)
    maturity_date: Mapped[date | None] = mapped_column(Date)
    indexer: Mapped[str | None] = mapped_column(Text)
    rate: Mapped[Decimal | None] = mapped_column(Numeric(8, 4))
    fgc_covered: Mapped[bool] = mapped_column(Boolean, server_default=text("false"))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class OpenFinanceConsent(Base):
    __tablename__ = "open_finance_consents"

    id: Mapped[UUID] = mapped_column(primary_key=True, server_default=_UUID_DEFAULT)
    client_id: Mapped[UUID] = mapped_column(ForeignKey("clients.id", ondelete="CASCADE"))
    institution_id: Mapped[UUID] = mapped_column(ForeignKey("institutions.id"))
    status: Mapped[ConsentStatus] = mapped_column(
        pg_enum(ConsentStatus, "consent_status"), server_default=text("'active'")
    )
    scopes: Mapped[list[str]] = mapped_column(ARRAY(Text), server_default=text("'{investments}'"))
    granted_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class Position(Base):
    """Snapshot atual de uma posição do cliente em uma instituição."""

    __tablename__ = "positions"
    __table_args__ = (
        CheckConstraint("source = 'xp' or consent_id is not null"),
        UniqueConstraint("client_id", "asset_id", "institution_id"),
    )

    id: Mapped[UUID] = mapped_column(primary_key=True, server_default=_UUID_DEFAULT)
    client_id: Mapped[UUID] = mapped_column(ForeignKey("clients.id", ondelete="CASCADE"))
    asset_id: Mapped[UUID] = mapped_column(ForeignKey("assets.id"))
    institution_id: Mapped[UUID] = mapped_column(ForeignKey("institutions.id"))
    source: Mapped[DataSource] = mapped_column(
        pg_enum(DataSource, "data_source"), server_default=text("'xp'")
    )
    consent_id: Mapped[UUID | None] = mapped_column(ForeignKey("open_finance_consents.id"))
    quantity: Mapped[Decimal] = mapped_column(Numeric(20, 6), server_default=text("0"))
    invested_value: Mapped[Decimal] = mapped_column(Numeric(18, 2))
    market_value: Mapped[Decimal] = mapped_column(Numeric(18, 2))
    held_since: Mapped[date] = mapped_column(Date)
    as_of: Mapped[date] = mapped_column(Date, server_default=func.current_date())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
