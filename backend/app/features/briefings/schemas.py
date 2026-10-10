"""Schemas Pydantic (request/response) da feature briefings (EP05, issue #26)."""

from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, Field, field_validator

from app.shared.schemas import ApiModel

DISCLAIMER = "Material de apoio para revisão do assessor."

SourceType = Literal["client", "position", "alert", "interaction", "news"]


class BriefingCreate(BaseModel):
    client_id: UUID
    meeting_context: str | None = Field(
        default=None, max_length=500, examples=["Revisão trimestral"]
    )

    @field_validator("meeting_context")
    @classmethod
    def blank_to_none(cls, value: str | None) -> str | None:
        if value is None:
            return None
        return value.strip() or None


class BriefingTopic(ApiModel):
    title: str = Field(examples=["Concentração por emissor"])
    reason: str


class SourceRef(ApiModel):
    """Referência rastreável usada no briefing (`contracts/domain.md`)."""

    type: SourceType
    id: UUID
    label: str
    updated_at: datetime | None = None


class BriefingContent(ApiModel):
    """Conteúdo gerado (por regras hoje; pela IA depois). Gravado em `briefings.content`."""

    summary: str
    topics: list[BriefingTopic] = Field(default_factory=list)
    suggested_questions: list[str] = Field(default_factory=list)


class BriefingOut(BriefingContent):
    id: UUID
    client_id: UUID
    sources: list[SourceRef] = Field(default_factory=list)
    generated_at: datetime
    disclaimer: str = DISCLAIMER
