from datetime import datetime
from typing import Any
from uuid import UUID

from sqlalchemy import Boolean, DateTime, ForeignKey, Text, func, text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.shared.enums import AlertPriority, AlertStatus, AlertType
from app.shared.models import Base, TimestampMixin, pg_enum


class AlertRule(Base):
    """Parâmetros das regras determinísticas — o copiloto lê para explicar os critérios."""

    __tablename__ = "alert_rules"

    type: Mapped[AlertType] = mapped_column(pg_enum(AlertType, "alert_type"), primary_key=True)
    description: Mapped[str] = mapped_column(Text)
    params: Mapped[dict[str, Any]] = mapped_column(JSONB)
    enabled: Mapped[bool] = mapped_column(Boolean, server_default=text("true"))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class Alert(TimestampMixin, Base):
    """Alerta gerado por `refresh_alerts()`; o assessor só altera os campos de revisão."""

    __tablename__ = "alerts"

    id: Mapped[UUID] = mapped_column(primary_key=True, server_default=text("gen_random_uuid()"))
    client_id: Mapped[UUID] = mapped_column(ForeignKey("clients.id", ondelete="CASCADE"))
    type: Mapped[AlertType] = mapped_column(
        pg_enum(AlertType, "alert_type"), ForeignKey("alert_rules.type")
    )
    priority: Mapped[AlertPriority] = mapped_column(pg_enum(AlertPriority, "alert_priority"))
    title: Mapped[str] = mapped_column(Text)
    evidence: Mapped[dict[str, Any]] = mapped_column(JSONB)
    rule_params: Mapped[dict[str, Any]] = mapped_column(JSONB)
    dedupe_key: Mapped[str] = mapped_column(Text)
    status: Mapped[AlertStatus] = mapped_column(
        pg_enum(AlertStatus, "alert_status"), server_default=text("'open'")
    )
    reviewed_by: Mapped[UUID | None] = mapped_column(ForeignKey("advisors.id"))
    reviewed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    review_note: Mapped[str | None] = mapped_column(Text)
    closed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
