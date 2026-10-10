"""Contrato HTTP da feature briefings. Briefings de atendimento gerados pela IA (EP05).

Montado em `/api/v1/briefings` por `app.main`.
"""

from fastapi import APIRouter

from app.shared.schemas import ERROR_RESPONSES

router = APIRouter(responses=ERROR_RESPONSES)
