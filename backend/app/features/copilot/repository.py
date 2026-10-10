"""Persistência da feature copilot. Retorna models/tipos de domínio, nunca Response HTTP."""

from typing import Any
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.features.copilot.models import AiLog
from app.shared.enums import AiLogKind


class CopilotRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def save_chat_log(
        self,
        *,
        message_id: UUID,
        advisor_id: UUID,
        client_id: UUID | None,
        prompt: str,
        response: str,
        tool_calls: list[dict[str, Any]],
        sources: list[dict[str, Any]],
        model: str,
    ) -> None:
        self.session.add(AiLog(
            id=message_id,
            advisor_id=advisor_id,
            client_id=client_id,
            kind=AiLogKind.CHAT,
            prompt=prompt,
            response=response,
            tool_calls=tool_calls,
            sources=sources,
            model=model,
        ))
        await self.session.flush()
