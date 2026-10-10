"""Schemas Pydantic (request/response) da feature interactions (EP04)."""

from datetime import date, datetime
from uuid import UUID

from pydantic import Field

from app.shared.enums import InteractionChannel
from app.shared.schemas import ApiModel


class ActionItemCreate(ApiModel):
    """Payload para criação de pendência combinada em atendimento."""

    description: str = Field(..., min_length=1, max_length=500, description="Descrição da ação")
    due_date: date | None = Field(default=None, description="Data limite acordada")


class ActionItemRead(ApiModel):
    """Representação de pendência ou próximo passo."""

    id: UUID
    client_id: UUID
    interaction_id: UUID | None = None
    description: str
    due_date: date | None = None
    done_at: datetime | None = None
    created_at: datetime


class InteractionCreate(ApiModel):
    """Payload para registrar novo atendimento com o cliente."""

    client_id: UUID = Field(..., description="ID do cliente")
    channel: InteractionChannel = Field(..., description="Canal do atendimento")
    summary: str = Field(..., min_length=1, description="Pauta e pontos abordados")
    decisions: str | None = Field(default=None, description="Decisões e próximos passos acordados")
    occurred_at: datetime | None = Field(
        default=None, description="Data e hora do atendimento (padrão: agora)"
    )
    action_items: list[ActionItemCreate] = Field(
        default_factory=list, description="Lista opcional de pendências a cadastrar"
    )


class InteractionRead(ApiModel):
    """Ficha do registro de atendimento histórico."""

    id: UUID
    client_id: UUID
    advisor_id: UUID
    occurred_at: datetime
    channel: InteractionChannel
    summary: str
    decisions: str | None = None
    created_at: datetime
    action_items: list[ActionItemRead] = Field(default_factory=list)


class InteractionSearchItem(ApiModel):
    """Resultado de busca semântica ou contextual de atendimentos."""

    interaction: InteractionRead
    score: float = Field(default=1.0, description="Pontuação de relevância da busca")
