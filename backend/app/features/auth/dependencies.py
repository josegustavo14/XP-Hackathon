from collections.abc import AsyncIterator
from typing import Annotated
from uuid import UUID

from fastapi import Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import Settings, get_settings
from app.core.database import open_rls_session
from app.features.auth.repository import AdvisorRepository
from app.features.auth.schemas import AuthenticatedUser
from app.features.auth.service import AuthService, decode_access_token
from app.shared.exceptions import NotAuthenticatedError

_bearer = HTTPBearer(auto_error=False, description="Access token do Supabase Auth")


def get_current_user(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(_bearer)],
    settings: Annotated[Settings, Depends(get_settings)],
) -> AuthenticatedUser:
    if credentials is None or credentials.scheme.lower() != "bearer":
        raise NotAuthenticatedError()
    return decode_access_token(credentials.credentials, settings)


CurrentUser = Annotated[AuthenticatedUser, Depends(get_current_user)]


async def get_advisor_session(user: CurrentUser) -> AsyncIterator[AsyncSession]:
    """Sessão de banco com RLS do assessor autenticado. Use em todo endpoint de assessor."""
    async for session in open_rls_session(user.claims):
        yield session


AdvisorSession = Annotated[AsyncSession, Depends(get_advisor_session)]


def get_auth_service(session: AdvisorSession) -> AuthService:
    return AuthService(AdvisorRepository(session))


AuthServiceDep = Annotated[AuthService, Depends(get_auth_service)]


async def require_client_access(
    client_id: UUID, user: CurrentUser, service: AuthServiceDep
) -> UUID:
    """Dependency reutilizável para rotas que recebem `client_id` no path."""
    await service.ensure_client_access(user.id, client_id)
    return client_id


AuthorizedClientId = Annotated[UUID, Depends(require_client_access)]
