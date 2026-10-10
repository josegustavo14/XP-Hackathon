"""Base declarativa do ORM.

Os models apenas MAPEIAM as tabelas criadas pelas migrations SQL (issue #43).
Nunca usar `Base.metadata.create_all()`: o schema é dono do banco.
"""

from datetime import datetime
from enum import StrEnum

from sqlalchemy import DateTime, func
from sqlalchemy.dialects.postgresql import ENUM
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


class Base(DeclarativeBase):
    pass


def pg_enum(enum_cls: type[StrEnum], name: str) -> ENUM:
    """Mapeia um StrEnum para um tipo enum já existente no Postgres."""
    return ENUM(
        enum_cls,
        name=name,
        create_type=False,
        values_callable=lambda members: [member.value for member in members],
    )


class CreatedAtMixin:
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )


class TimestampMixin(CreatedAtMixin):
    # Atualizado pelo trigger set_updated_at() no banco
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
