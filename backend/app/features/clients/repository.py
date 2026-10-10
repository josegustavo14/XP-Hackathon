"""Persistência da feature clients. Retorna models/tipos de domínio, nunca Response HTTP."""

from sqlalchemy.ext.asyncio import AsyncSession


class ClientRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session
