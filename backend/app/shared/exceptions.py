"""Exceções de domínio.

Services e repositories levantam estas exceções, sem conhecer HTTP.
A tradução para status code + envelope de erro acontece em `app.core.errors`.
"""

from typing import Any


class DomainError(Exception):
    """Base de todas as exceções de negócio."""

    code: str = "DOMAIN_ERROR"
    message: str = "Não foi possível concluir a operação."

    def __init__(
        self,
        message: str | None = None,
        *,
        code: str | None = None,
        details: dict[str, Any] | None = None,
    ) -> None:
        self.message = message or self.message
        self.code = code or self.code
        self.details = details or {}
        super().__init__(self.message)


class InvalidRequestError(DomainError):
    code = "INVALID_REQUEST"
    message = "Requisição inválida."


class NotAuthenticatedError(DomainError):
    code = "NOT_AUTHENTICATED"
    message = "Autenticação necessária."


class PermissionDeniedError(DomainError):
    code = "PERMISSION_DENIED"
    message = "Você não tem acesso a este recurso."


class NotFoundError(DomainError):
    code = "NOT_FOUND"
    message = "Recurso não encontrado."


class ConflictError(DomainError):
    code = "CONFLICT"
    message = "Conflito com o estado atual do recurso."
