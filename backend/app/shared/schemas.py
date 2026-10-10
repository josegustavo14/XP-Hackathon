"""Schemas globais do contrato da API (issue #38)."""

import math
from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class ApiModel(BaseModel):
    """Base dos schemas de resposta: aceita objetos ORM e mantém snake_case."""

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)


# ---------------------------------------------------------------------------
# Erro padrão
# ---------------------------------------------------------------------------


class ErrorBody(BaseModel):
    code: str = Field(examples=["CLIENT_NOT_FOUND"])
    message: str = Field(examples=["Cliente não encontrado."])
    details: dict[str, Any] = Field(default_factory=dict)
    trace_id: str = Field(examples=["0199d9ea-8af8-7e7b-b631-3bcb04a8b680"])


class ErrorResponse(BaseModel):
    error: ErrorBody


# Respostas de erro documentadas no OpenAPI de todos os routers
ERROR_RESPONSES: dict[int | str, dict[str, Any]] = {
    401: {"model": ErrorResponse, "description": "Não autenticado"},
    403: {"model": ErrorResponse, "description": "Sem acesso ao recurso"},
    404: {"model": ErrorResponse, "description": "Recurso inexistente"},
    422: {"model": ErrorResponse, "description": "Erro de validação"},
    500: {"model": ErrorResponse, "description": "Erro inesperado"},
    503: {"model": ErrorResponse, "description": "Serviço temporariamente indisponível"},
}


# ---------------------------------------------------------------------------
# Paginação
# ---------------------------------------------------------------------------


class PageMeta(BaseModel):
    page: int = Field(ge=1, examples=[1])
    page_size: int = Field(ge=1, examples=[25])
    total: int = Field(ge=0, examples=[128])
    total_pages: int = Field(ge=0, examples=[6])

    @classmethod
    def build(cls, *, page: int, page_size: int, total: int) -> "PageMeta":
        return cls(
            page=page,
            page_size=page_size,
            total=total,
            total_pages=math.ceil(total / page_size) if total else 0,
        )


class Page[T](BaseModel):
    items: list[T]
    meta: PageMeta
