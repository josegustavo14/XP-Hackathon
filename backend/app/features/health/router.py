"""Health check da API (issue #42)."""

from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter(tags=["health"])


class HealthResponse(BaseModel):
    status: str = "ok"


@router.get("/health", response_model=HealthResponse, summary="Verificação de integridade da API")
async def health_check() -> HealthResponse:
    return HealthResponse(status="ok")
