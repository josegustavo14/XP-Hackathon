"""Schemas Pydantic (request/response) da feature copilot.

Herdar de `app.shared.schemas.ApiModel`; enums vêm de `app.shared.enums`.
"""

from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import Field, field_validator

from app.shared.schemas import ApiModel


class ChatRequest(ApiModel):
	session_id: UUID | None = None
	message: str = Field(min_length=1, max_length=4000)
	client_id: UUID | None = None

	@field_validator("message")
	@classmethod
	def message_must_contain_text(cls, value: str) -> str:
		normalized = value.strip()
		if not normalized:
			raise ValueError("A mensagem não pode estar vazia.")
		return normalized


class CopilotSourceOut(ApiModel):
	type: Literal["client", "position", "alert", "interaction", "news"]
	id: UUID
	label: str
	updated_at: datetime | None = None


class SuggestedActionOut(ApiModel):
	type: str
	label: str
	target_id: UUID


class ChatResponse(ApiModel):
	session_id: UUID
	message_id: UUID
	answer: str
	sources: list[CopilotSourceOut] = Field(default_factory=list)
	suggested_actions: list[SuggestedActionOut] = Field(default_factory=list)
	disclaimer: str
