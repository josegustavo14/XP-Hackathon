import asyncio
from uuid import UUID

import pytest

from app.core.config import Settings
from app.features.auth.dependencies import get_auth_service
from app.features.auth.schemas import AdvisorOut, LoginRequest
from app.features.auth.service import AuthService, decode_access_token, login_with_mock
from app.shared.exceptions import NotFoundError, PermissionDeniedError


@pytest.fixture
def mock_settings() -> Settings:
    return Settings(
        env="test",
        auth_mode="mock",
        mock_auth_email="assessor@demo.com",
        mock_auth_password="string",
        mock_auth_advisor_id=UUID("00000000-0000-4000-8000-000000000001"),
        mock_auth_advisor_name="Assessor Demo",
        local_jwt_secret="test-local-secret-with-at-least-32-chars",
    )


def test_mock_login_returns_a_bearer_token(client, mock_settings: Settings) -> None:
    from app.core.config import get_settings

    client.app.dependency_overrides[get_settings] = lambda: mock_settings
    response = client.post(
        "/api/v1/auth/login", json={"email": "assessor@demo.com", "password": "string"}
    )

    assert response.status_code == 200
    body = response.json()
    assert body["token_type"] == "bearer"
    assert body["expires_in"] == 3600
    assert body["advisor"] == {
        "id": "00000000-0000-4000-8000-000000000001",
        "name": "Assessor Demo",
        "email": "assessor@demo.com",
    }
    user = decode_access_token(body["access_token"], mock_settings)
    assert user.id == mock_settings.mock_auth_advisor_id


def test_mock_login_rejects_invalid_credentials(client, mock_settings: Settings) -> None:
    from app.core.config import get_settings

    client.app.dependency_overrides[get_settings] = lambda: mock_settings
    response = client.post(
        "/api/v1/auth/login", json={"email": "assessor@demo.com", "password": "wrong"}
    )

    assert response.status_code == 401
    assert response.json()["error"]["code"] == "INVALID_CREDENTIALS"


def test_me_accepts_the_token_issued_by_mock_login(client, mock_settings: Settings) -> None:
    from app.core.config import get_settings

    class FakeAuthService:
        async def get_advisor(self, user):
            assert user.id == mock_settings.mock_auth_advisor_id
            return AdvisorOut(
                id=mock_settings.mock_auth_advisor_id,
                name=mock_settings.mock_auth_advisor_name,
                email=mock_settings.mock_auth_email,
            )

    client.app.dependency_overrides[get_settings] = lambda: mock_settings
    client.app.dependency_overrides[get_auth_service] = lambda: FakeAuthService()
    login_response = client.post(
        "/api/v1/auth/login", json={"email": "assessor@demo.com", "password": "string"}
    )

    response = client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {login_response.json()['access_token']}"},
    )

    assert response.status_code == 200
    assert response.json()["email"] == "assessor@demo.com"


class FakeRepository:
    def __init__(self, allowed: bool) -> None:
        self.allowed = allowed

    async def has_client_access(self, advisor_id: UUID, client_id: UUID) -> bool:
        return self.allowed


def test_client_access_is_denied_without_advisor_client_link() -> None:
    service = AuthService(FakeRepository(allowed=False))  # type: ignore[arg-type]

    with pytest.raises(PermissionDeniedError, match="não tem acesso"):
        asyncio.run(service.ensure_client_access(UUID(int=1), UUID(int=2)))


def test_client_access_is_allowed_with_advisor_client_link() -> None:
    service = AuthService(FakeRepository(allowed=True))  # type: ignore[arg-type]
    asyncio.run(service.ensure_client_access(UUID(int=1), UUID(int=2)))


def test_mock_login_is_unavailable_in_supabase_mode() -> None:
    settings = Settings(env="test", auth_mode="supabase")
    with pytest.raises(NotFoundError, match="Login demonstrativo"):
        login_with_mock(LoginRequest(email="assessor@demo.com", password="string"), settings)
