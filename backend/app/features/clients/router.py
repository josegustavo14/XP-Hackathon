"""Contrato HTTP da feature clients. Carteira de clientes do assessor (EP01/EP04).

Montado em `/api/v1/clients` por `app.main`.
"""

from fastapi import APIRouter

from app.shared.schemas import ERROR_RESPONSES

router = APIRouter(responses=ERROR_RESPONSES)
