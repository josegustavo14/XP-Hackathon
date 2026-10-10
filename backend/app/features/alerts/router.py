"""Contrato HTTP da feature alerts. Riscos e oportunidades gerados por regras explicáveis (EP03).

Montado em `/api/v1/alerts` por `app.main`.
"""

from fastapi import APIRouter

from app.shared.schemas import ERROR_RESPONSES

router = APIRouter(responses=ERROR_RESPONSES)
