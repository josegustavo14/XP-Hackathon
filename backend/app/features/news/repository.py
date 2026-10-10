"""Persistência da feature news. Retorna models/tipos de domínio, nunca Response HTTP."""

from sqlalchemy.ext.asyncio import AsyncSession


class NewsRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session
