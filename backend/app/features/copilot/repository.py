"""Persistência da feature copilot. Retorna models/tipos de domínio, nunca Response HTTP."""

from sqlalchemy.ext.asyncio import AsyncSession


class CopilotRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session
