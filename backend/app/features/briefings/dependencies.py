"""Dependências locais da feature briefings."""

from typing import Annotated

from fastapi import Depends

from app.features.auth.dependencies import AdvisorSession
from app.features.briefings.repository import BriefingRepository
from app.features.briefings.service import BriefingService


def get_briefings_service(session: AdvisorSession) -> BriefingService:
    return BriefingService(BriefingRepository(session))


BriefingServiceDep = Annotated[BriefingService, Depends(get_briefings_service)]
