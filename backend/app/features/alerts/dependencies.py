"""Dependências locais da feature alerts."""

from typing import Annotated

from fastapi import Depends

from app.features.alerts.repository import AlertRepository
from app.features.alerts.service import AlertService
from app.features.auth.dependencies import AdvisorSession


def get_alerts_service(session: AdvisorSession) -> AlertService:
    return AlertService(AlertRepository(session))


AlertServiceDep = Annotated[AlertService, Depends(get_alerts_service)]
