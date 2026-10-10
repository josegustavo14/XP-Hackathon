"""Persistência da feature alerts. Retorna models/tipos de domínio, nunca Response HTTP."""

from sqlalchemy.ext.asyncio import AsyncSession


class AlertRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session
