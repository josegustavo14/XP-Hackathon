from datetime import date, datetime
from typing import Any
from uuid import UUID

from sqlalchemy import CHAR, Date, DateTime, ForeignKey, SmallInteger, Text, text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.shared.enums import RiskProfile
from app.shared.models import Base, TimestampMixin, pg_enum


class Client(TimestampMixin, Base):
    """Cliente do assessor. Tratamento mínimo de dados pessoais (sem CPF/endereço/telefone)."""

    __tablename__ = "clients"

    id: Mapped[UUID] = mapped_column(primary_key=True, server_default=text("gen_random_uuid()"))
    advisor_id: Mapped[UUID] = mapped_column(ForeignKey("advisors.id"))
    full_name: Mapped[str] = mapped_column(Text)
    birth_year: Mapped[int | None] = mapped_column(SmallInteger)
    city: Mapped[str | None] = mapped_column(Text)
    state: Mapped[str | None] = mapped_column(CHAR(2))
    risk_profile: Mapped[RiskProfile] = mapped_column(pg_enum(RiskProfile, "risk_profile"))
    suitability_expires_at: Mapped[date | None] = mapped_column(Date)
    investment_horizon_yrs: Mapped[int | None] = mapped_column(SmallInteger)
    liquidity_need: Mapped[str | None] = mapped_column(Text)
    preferences: Mapped[dict[str, Any]] = mapped_column(JSONB, server_default=text("'{}'::jsonb"))
    last_contact_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    next_contact_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
