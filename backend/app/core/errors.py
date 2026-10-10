"""Boundary HTTP de erros: traduz exceções em `{"error": {...}}` (issue #38)."""

import logging
from http import HTTPStatus
from typing import Any

from fastapi import FastAPI, Request
from fastapi.encoders import jsonable_encoder
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.core.middleware import TRACE_ID_HEADER, get_trace_id
from app.shared.exceptions import (
    ConflictError,
    DomainError,
    InvalidRequestError,
    NotAuthenticatedError,
    NotFoundError,
    PermissionDeniedError,
    ServiceUnavailableError,
)

logger = logging.getLogger("app.errors")

# Exceção de domínio -> status HTTP (mais específica primeiro)
DOMAIN_STATUS: dict[type[DomainError], int] = {
    InvalidRequestError: 400,
    NotAuthenticatedError: 401,
    PermissionDeniedError: 403,
    NotFoundError: 404,
    ConflictError: 409,
    ServiceUnavailableError: 503,
}


def _status_for(exc: DomainError) -> int:
    for exc_type, status in DOMAIN_STATUS.items():
        if isinstance(exc, exc_type):
            return status
    return 400


def _code_for_status(status: int) -> str:
    try:
        return HTTPStatus(status).name  # ex.: 404 -> NOT_FOUND
    except ValueError:
        return "HTTP_ERROR"


def error_response(
    request: Request,
    *,
    status_code: int,
    code: str,
    message: str,
    details: dict[str, Any] | None = None,
    headers: dict[str, str] | None = None,
) -> JSONResponse:
    trace_id = get_trace_id(request)
    return JSONResponse(
        status_code=status_code,
        content={
            "error": {
                "code": code,
                "message": message,
                "details": jsonable_encoder(details or {}),
                "trace_id": trace_id,
            }
        },
        headers={**(headers or {}), TRACE_ID_HEADER: trace_id},
    )


async def domain_error_handler(request: Request, exc: DomainError) -> JSONResponse:
    status = _status_for(exc)
    headers = {"WWW-Authenticate": "Bearer"} if status == 401 else None
    return error_response(
        request,
        status_code=status,
        code=exc.code,
        message=exc.message,
        details=exc.details,
        headers=headers,
    )


async def http_exception_handler(request: Request, exc: StarletteHTTPException) -> JSONResponse:
    message = exc.detail if isinstance(exc.detail, str) else HTTPStatus(exc.status_code).phrase
    return error_response(
        request,
        status_code=exc.status_code,
        code=_code_for_status(exc.status_code),
        message=message,
        headers=getattr(exc, "headers", None),
    )


async def validation_error_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
    errors = [
        {"loc": list(err.get("loc", [])), "msg": err.get("msg"), "type": err.get("type")}
        for err in exc.errors()
    ]
    return error_response(
        request,
        status_code=422,
        code="VALIDATION_ERROR",
        message="Dados da requisição inválidos.",
        details={"errors": errors},
    )


async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    logger.exception("Erro inesperado [trace_id=%s]", get_trace_id(request), exc_info=exc)
    return error_response(
        request,
        status_code=500,
        code="INTERNAL_ERROR",
        message="Erro inesperado. Tente novamente mais tarde.",
    )


def register_exception_handlers(app: FastAPI) -> None:
    app.add_exception_handler(DomainError, domain_error_handler)
    app.add_exception_handler(StarletteHTTPException, http_exception_handler)
    app.add_exception_handler(RequestValidationError, validation_error_handler)
    app.add_exception_handler(Exception, unhandled_exception_handler)
