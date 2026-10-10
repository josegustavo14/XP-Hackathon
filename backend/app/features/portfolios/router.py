"""Contrato HTTP da feature portfolios. Posições, ativos, instituições e Open Finance (EP01/EP06).

Montado em `/api/v1/portfolios` por `app.main`.
"""

from fastapi import APIRouter

from app.shared.schemas import ERROR_RESPONSES

router = APIRouter(responses=ERROR_RESPONSES)
