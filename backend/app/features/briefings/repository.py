"""Persistência da feature briefings. Retorna models/tipos de domínio, nunca Response HTTP."""

from sqlalchemy.ext.asyncio import AsyncSession


class BriefingRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session
