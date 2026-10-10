"""Persistência da feature portfolios. Retorna models/tipos de domínio, nunca Response HTTP."""

from sqlalchemy.ext.asyncio import AsyncSession


class PortfolioRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session
