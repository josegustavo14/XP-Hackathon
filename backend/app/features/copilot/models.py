from typing import Any
from uuid import UUID

from sqlalchemy import Boolean, ForeignKey, Text, text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.shared.enums import AiLogKind
from app.shared.models import Base, CreatedAtMixin, pg_enum


class AiLog(CreatedAtMixin, Base):
    """Rastreabilidade da IA (append-only): prompt, resposta, tools e fontes usadas.

    Compartilhado com `briefings` (kind = 'briefing').
    """

    __tablename__ = "ai_logs"

    id: Mapped[UUID] = mapped_column(primary_key=True, server_default=text("gen_random_uuid()"))
    advisor_id: Mapped[UUID] = mapped_column(ForeignKey("advisors.id"))
    client_id: Mapped[UUID | None] = mapped_column(ForeignKey("clients.id", ondelete="SET NULL"))
    kind: Mapped[AiLogKind] = mapped_column(pg_enum(AiLogKind, "ai_log_kind"))
    prompt: Mapped[str] = mapped_column(Text)
    response: Mapped[str] = mapped_column(Text)
    tool_calls: Mapped[list[Any]] = mapped_column(JSONB, server_default=text("'[]'::jsonb"))
    sources: Mapped[list[Any]] = mapped_column(JSONB, server_default=text("'[]'::jsonb"))
    model: Mapped[str | None] = mapped_column(Text)
    approved: Mapped[bool | None] = mapped_column(Boolean)
