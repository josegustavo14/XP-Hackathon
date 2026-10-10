from dataclasses import dataclass, field
from typing import Any
from uuid import UUID

from pydantic import Field

from app.shared.schemas import ApiModel


@dataclass(frozen=True, slots=True)
class AuthenticatedUser:
    """Tipo de domínio: quem está chamando a API (derivado do JWT, nunca do body)."""

    id: UUID
    email: str | None
    claims: dict[str, Any] = field(repr=False)


class AdvisorOut(ApiModel):
    """Contrato `Advisor` da issue #39."""

    id: UUID
    name: str = Field(validation_alias="full_name")
    email: str
    office: str | None = None
