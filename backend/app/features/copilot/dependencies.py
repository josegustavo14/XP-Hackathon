"""Dependências locais da feature copilot."""

from typing import Annotated

from fastapi import Depends

from app.features.auth.dependencies import AdvisorSession
from app.features.copilot.repository import CopilotRepository
from app.features.copilot.service import CopilotService


def get_copilot_service(session: AdvisorSession) -> CopilotService:
    return CopilotService(CopilotRepository(session))


CopilotServiceDep = Annotated[CopilotService, Depends(get_copilot_service)]
