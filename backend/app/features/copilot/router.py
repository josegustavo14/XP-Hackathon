"""Contrato HTTP da feature copilot. Copiloto IA do assessor (EP02).

Montado em `/api/v1/copilot` por `app.main`.
"""

from fastapi import APIRouter

from app.shared.schemas import ERROR_RESPONSES

router = APIRouter(responses=ERROR_RESPONSES)
