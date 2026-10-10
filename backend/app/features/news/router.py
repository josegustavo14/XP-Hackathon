"""Contrato HTTP da feature news. Notícias e impacto nos clientes.

Montado em `/api/v1/news` por `app.main`.
"""

from fastapi import APIRouter

from app.shared.schemas import ERROR_RESPONSES

router = APIRouter(responses=ERROR_RESPONSES)
