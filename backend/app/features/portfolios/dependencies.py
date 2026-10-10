"""Dependências locais da feature portfolios."""

from typing import Annotated

from fastapi import Depends

from app.features.auth.dependencies import AdvisorSession
from app.features.portfolios.repository import PortfolioRepository
from app.features.portfolios.service import PortfolioService


def get_portfolios_service(session: AdvisorSession) -> PortfolioService:
    return PortfolioService(PortfolioRepository(session))


PortfolioServiceDep = Annotated[PortfolioService, Depends(get_portfolios_service)]
