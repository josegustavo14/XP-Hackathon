"""Persistência da feature interactions. Retorna models/tipos de domínio, nunca Response HTTP."""

from sqlalchemy.ext.asyncio import AsyncSession


class InteractionRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session
