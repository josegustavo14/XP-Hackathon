"""Contrato HTTP da feature interactions.
Memória de relacionamento: interações, metas e pendências (EP04).

Montado em `/api/v1/interactions` por `app.main`.
"""

from fastapi import APIRouter

from app.shared.schemas import ERROR_RESPONSES

router = APIRouter(responses=ERROR_RESPONSES)
