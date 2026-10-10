"""Regras de negócio da feature briefings (EP05, issue #26).

Recebe tipos de domínio (nunca `Request`) e levanta exceções de
`app.shared.exceptions`; a tradução para HTTP acontece no boundary.
"""

from uuid import UUID

from app.features.briefings.composer import collect_sources, compose_briefing
from app.features.briefings.repository import BriefingRepository
from app.features.briefings.schemas import DISCLAIMER, BriefingCreate, BriefingOut
from app.shared.exceptions import NotFoundError


class BriefingService:
    def __init__(self, repository: BriefingRepository) -> None:
        self.repository = repository

    async def create_briefing(self, payload: BriefingCreate, *, advisor_id: UUID) -> BriefingOut:
        """Gera e grava um briefing em rascunho. Não envia nada ao cliente."""
        context = await self.repository.load_context(
            payload.client_id, advisor_id=advisor_id, meeting_context=payload.meeting_context
        )
        if context is None:
            raise NotFoundError("Cliente não encontrado.", code="CLIENT_NOT_FOUND")

        content = compose_briefing(context)
        sources = collect_sources(context)
        saved = await self.repository.save_briefing(
            client_id=payload.client_id, advisor_id=advisor_id, content=content, sources=sources
        )
        return BriefingOut(
            **content.model_dump(),
            id=saved.id,
            client_id=payload.client_id,
            sources=sources,
            generated_at=saved.created_at,
            disclaimer=DISCLAIMER,
        )
