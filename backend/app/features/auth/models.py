from uuid import UUID

from sqlalchemy import Text
from sqlalchemy.orm import Mapped, mapped_column

from app.shared.models import Base, TimestampMixin


class Advisor(TimestampMixin, Base):
    """Assessor — 1:1 com `auth.users` do Supabase."""

    __tablename__ = "advisors"

    id: Mapped[UUID] = mapped_column(primary_key=True)
    full_name: Mapped[str] = mapped_column(Text)
    email: Mapped[str] = mapped_column(Text, unique=True)
    office: Mapped[str | None] = mapped_column(Text)
