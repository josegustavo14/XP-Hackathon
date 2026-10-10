from datetime import datetime
from typing import Any
from uuid import UUID

from sqlalchemy import DateTime, ForeignKey, text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.shared.enums import BriefingStatus
from app.shared.models import Base, TimestampMixin, pg_enum


class Briefing(TimestampMixin, Base):
    """Briefing pré-atendimento (EP05): rascunho revisável, nunca enviado ao cliente.

    `content` é imutável após criado (grants do banco); o assessor edita `edited_content`.
    """

    __tablename__ = "briefings"

    id: Mapped[UUID] = mapped_column(primary_key=True, server_default=text("gen_random_uuid()"))
    client_id: Mapped[UUID] = mapped_column(ForeignKey("clients.id", ondelete="CASCADE"))
    advisor_id: Mapped[UUID] = mapped_column(ForeignKey("advisors.id"))
    meeting_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    status: Mapped[BriefingStatus] = mapped_column(
        pg_enum(BriefingStatus, "briefing_status"), server_default=text("'draft'")
    )
    content: Mapped[dict[str, Any]] = mapped_column(JSONB)
    edited_content: Mapped[dict[str, Any] | None] = mapped_column(JSONB)
    # {"alert_ids": [...], "news_ids": [...], "interaction_ids": [...]}
    sources: Mapped[dict[str, Any]] = mapped_column(JSONB, server_default=text("'{}'::jsonb"))
    ai_log_id: Mapped[UUID | None] = mapped_column(ForeignKey("ai_logs.id", ondelete="SET NULL"))
    interaction_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("interactions.id", ondelete="SET NULL")
    )
    reviewed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
