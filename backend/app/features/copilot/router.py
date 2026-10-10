"""Contrato HTTP da feature copilot. Copiloto IA do assessor (EP02).

Montado em `/api/v1/copilot` por `app.main`.
"""

from fastapi import APIRouter

from app.features.auth.dependencies import CurrentUser
from app.features.copilot.dependencies import CopilotServiceDep
from app.features.copilot.schemas import ChatRequest, ChatResponse
from app.shared.schemas import ERROR_RESPONSES

router = APIRouter(responses=ERROR_RESPONSES)


@router.post("/chat", response_model=ChatResponse)
async def chat(
	payload: ChatRequest,
	service: CopilotServiceDep,
	current_user: CurrentUser,
) -> ChatResponse:
	return await service.chat(payload, advisor_id=current_user.id)
