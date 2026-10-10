from datetime import date, datetime
from decimal import Decimal
from uuid import UUID

from sqlalchemy import Date, DateTime, ForeignKey, Numeric, Text, func, text
from sqlalchemy.orm import Mapped, mapped_column

from app.shared.enums import GoalStatus, InteractionChannel
from app.shared.models import Base, CreatedAtMixin, TimestampMixin, pg_enum

_UUID_DEFAULT = text("gen_random_uuid()")


class Interaction(CreatedAtMixin, Base):
    """Registro de atendimento.

    A coluna `embedding vector(1024)` existe no banco mas não é mapeada aqui:
    a busca semântica usa a função SQL `match_interactions()`.
    """

    __tablename__ = "interactions"

    id: Mapped[UUID] = mapped_column(primary_key=True, server_default=_UUID_DEFAULT)
    client_id: Mapped[UUID] = mapped_column(ForeignKey("clients.id", ondelete="CASCADE"))
    advisor_id: Mapped[UUID] = mapped_column(ForeignKey("advisors.id"))
    occurred_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    channel: Mapped[InteractionChannel] = mapped_column(
        pg_enum(InteractionChannel, "interaction_channel")
    )
    summary: Mapped[str] = mapped_column(Text)
    decisions: Mapped[str | None] = mapped_column(Text)


class Goal(TimestampMixin, Base):
    __tablename__ = "goals"

    id: Mapped[UUID] = mapped_column(primary_key=True, server_default=_UUID_DEFAULT)
    client_id: Mapped[UUID] = mapped_column(ForeignKey("clients.id", ondelete="CASCADE"))
    advisor_id: Mapped[UUID] = mapped_column(ForeignKey("advisors.id"))
    title: Mapped[str] = mapped_column(Text)
    target_amount: Mapped[Decimal | None] = mapped_column(Numeric(18, 2))
    target_date: Mapped[date | None] = mapped_column(Date)
    status: Mapped[GoalStatus] = mapped_column(
        pg_enum(GoalStatus, "goal_status"), server_default=text("'active'")
    )
    notes: Mapped[str | None] = mapped_column(Text)


class ActionItem(TimestampMixin, Base):
    """Pendência combinada em reunião ("o que ficou de fazer")."""

    __tablename__ = "action_items"

    id: Mapped[UUID] = mapped_column(primary_key=True, server_default=_UUID_DEFAULT)
    client_id: Mapped[UUID] = mapped_column(ForeignKey("clients.id", ondelete="CASCADE"))
    interaction_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("interactions.id", ondelete="SET NULL")
    )
    description: Mapped[str] = mapped_column(Text)
    due_date: Mapped[date | None] = mapped_column(Date)
    done_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
