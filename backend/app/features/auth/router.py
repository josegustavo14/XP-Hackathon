"""Contrato HTTP da feature auth. Montado em `/api/v1/auth` por `app.main`."""

from fastapi import APIRouter

from app.features.auth.dependencies import AuthServiceDep, CurrentUser
from app.features.auth.schemas import AdvisorOut
from app.shared.schemas import ERROR_RESPONSES

router = APIRouter(responses=ERROR_RESPONSES)


@router.get("/me", response_model=AdvisorOut, summary="Assessor autenticado")
async def read_me(user: CurrentUser, service: AuthServiceDep) -> AdvisorOut:
    advisor = await service.get_advisor(user)
    return AdvisorOut.model_validate(advisor)
