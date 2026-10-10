"""Contrato HTTP da feature auth. Montado em `/api/v1/auth` por `app.main`."""

from typing import Annotated

from fastapi import APIRouter, Depends

from app.core.config import Settings, get_settings
from app.features.auth.dependencies import AuthServiceDep, CurrentUser
from app.features.auth.schemas import AdvisorOut, LoginRequest, LoginResponse
from app.features.auth.service import login_with_mock
from app.shared.schemas import ERROR_RESPONSES

router = APIRouter(responses=ERROR_RESPONSES)


@router.post("/login", response_model=LoginResponse, summary="Login demonstrativo")
async def login(
    credentials: LoginRequest,
    settings: Annotated[Settings, Depends(get_settings)],
) -> LoginResponse:
    return login_with_mock(credentials, settings)


@router.get("/me", response_model=AdvisorOut, summary="Assessor autenticado")
async def read_me(user: CurrentUser, service: AuthServiceDep) -> AdvisorOut:
    advisor = await service.get_advisor(user)
    return AdvisorOut.model_validate(advisor)
