from uuid import UUID

from sqlalchemy import ForeignKey, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.shared.models import Base, TimestampMixin


class Advisor(TimestampMixin, Base):
    """Assessor — 1:1 com `auth.users` do Supabase."""

    __tablename__ = "advisors"

    id: Mapped[UUID] = mapped_column(primary_key=True)
    full_name: Mapped[str] = mapped_column(Text)
    email: Mapped[str] = mapped_column(Text, unique=True)
    office: Mapped[str | None] = mapped_column(Text)


class AdvisorClient(Base):
    """Vínculo explícito usado para escopo de autorização de clientes."""

    __tablename__ = "advisor_clients"

    advisor_id: Mapped[UUID] = mapped_column(ForeignKey("advisors.id"), primary_key=True)
    client_id: Mapped[UUID] = mapped_column(ForeignKey("clients.id"), primary_key=True)
