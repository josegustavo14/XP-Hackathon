from functools import lru_cache
from typing import Any
from uuid import UUID

import jwt

from app.core.config import Settings
from app.features.auth.models import Advisor
from app.features.auth.repository import AdvisorRepository
from app.features.auth.schemas import AuthenticatedUser
from app.shared.exceptions import NotAuthenticatedError, NotFoundError

_ASYMMETRIC_ALGS = ["RS256", "ES256"]


@lru_cache
def _jwks_client(jwks_url: str) -> jwt.PyJWKClient:
    return jwt.PyJWKClient(jwks_url, cache_keys=True)


def decode_access_token(token: str, settings: Settings) -> AuthenticatedUser:
    """Valida o access token do Supabase Auth.

    Suporta o JWT secret legado (HS256) e as chaves assimétricas novas
    (RS256/ES256 via JWKS do projeto).
    """
    try:
        alg = jwt.get_unverified_header(token).get("alg")
        if alg == "HS256":
            if not settings.supabase_jwt_secret:
                raise NotAuthenticatedError("Validação de token não configurada no servidor.")
            key: Any = settings.supabase_jwt_secret
            algorithms = ["HS256"]
        else:
            jwks_url = f"{settings.supabase_url.rstrip('/')}/auth/v1/.well-known/jwks.json"
            key = _jwks_client(jwks_url).get_signing_key_from_jwt(token)
            algorithms = _ASYMMETRIC_ALGS

        claims = jwt.decode(
            token,
            key,
            algorithms=algorithms,
            audience=settings.supabase_jwt_audience,
            options={"require": ["sub", "exp"]},
        )
    except jwt.ExpiredSignatureError as exc:
        raise NotAuthenticatedError("Sessão expirada.", code="TOKEN_EXPIRED") from exc
    except (jwt.PyJWTError, ValueError) as exc:
        raise NotAuthenticatedError("Token inválido.", code="INVALID_TOKEN") from exc

    try:
        user_id = UUID(claims["sub"])
    except ValueError as exc:
        raise NotAuthenticatedError("Token inválido.", code="INVALID_TOKEN") from exc

    return AuthenticatedUser(id=user_id, email=claims.get("email"), claims=claims)


class AuthService:
    def __init__(self, repository: AdvisorRepository) -> None:
        self.repository = repository

    async def get_advisor(self, user: AuthenticatedUser) -> Advisor:
        advisor = await self.repository.get_by_id(user.id)
        if advisor is None:
            raise NotFoundError("Assessor não cadastrado.", code="ADVISOR_NOT_FOUND")
        return advisor
