"""Dependências locais da feature interactions."""

from typing import Annotated

from fastapi import Depends

from app.features.auth.dependencies import AdvisorSession
from app.features.interactions.repository import InteractionRepository
from app.features.interactions.service import InteractionService


def get_interactions_service(session: AdvisorSession) -> InteractionService:
    return InteractionService(InteractionRepository(session))


InteractionServiceDep = Annotated[InteractionService, Depends(get_interactions_service)]
