"""Contrato HTTP da feature briefings. Briefings de atendimento (EP05, issue #26).

Montado em `/api/v1/briefings` por `app.main`.
"""

from fastapi import APIRouter, status

from app.features.auth.dependencies import CurrentUser
from app.features.briefings.dependencies import BriefingServiceDep
from app.features.briefings.schemas import BriefingCreate, BriefingOut
from app.shared.schemas import ERROR_RESPONSES

router = APIRouter(responses=ERROR_RESPONSES)


@router.post(
    "",
    response_model=BriefingOut,
    status_code=status.HTTP_201_CREATED,
    summary="Gerar briefing pré-atendimento",
)
async def create_briefing(
    payload: BriefingCreate,
    service: BriefingServiceDep,
    user: CurrentUser,
) -> BriefingOut:
    """Gera um rascunho para revisão do assessor. Nada é enviado ao cliente."""
    return await service.create_briefing(payload, advisor_id=user.id)
