from datetime import date, datetime
from decimal import Decimal
from unittest.mock import AsyncMock
from uuid import UUID, uuid4

import pytest
from fastapi.testclient import TestClient

from app.features.auth.dependencies import get_current_user
from app.features.auth.schemas import AuthenticatedUser
from app.features.interactions.dependencies import get_interactions_service
from app.features.interactions.schemas import GoalRead
from app.features.interactions.service import InteractionService
from app.main import create_app
from app.shared.enums import GoalStatus
from app.shared.exceptions import NotFoundError


def test_list_goals_unauthorized(client: TestClient) -> None:
    response = client.get(f"/api/v1/clients/{uuid4()}/goals")
    assert response.status_code == 401
    assert response.json()["error"]["code"] == "NOT_AUTHENTICATED"


def test_create_goal_unauthorized(client: TestClient) -> None:
    response = client.post(
        f"/api/v1/clients/{uuid4()}/goals",
        json={"title": "Aposentadoria", "target_amount": "1000000.00"},
    )
    assert response.status_code == 401
    assert response.json()["error"]["code"] == "NOT_AUTHENTICATED"


@pytest.fixture
def mock_goals_service() -> InteractionService:
    service = AsyncMock(spec=InteractionService)
    return service


@pytest.fixture
def auth_goals_client(mock_goals_service: InteractionService) -> TestClient:
    app = create_app()
    advisor_id = UUID("cfad0fda-72e6-5474-9ec5-eecb3d065425")
    user = AuthenticatedUser(
        id=advisor_id,
        email="assessor.teste@xp.com.br",
        claims={"sub": str(advisor_id), "role": "authenticated"},
    )
    app.dependency_overrides[get_current_user] = lambda: user
    app.dependency_overrides[get_interactions_service] = lambda: mock_goals_service
    return TestClient(app)


def test_list_client_goals_success(
    auth_goals_client: TestClient,
    mock_goals_service: AsyncMock,
) -> None:
    client_id = uuid4()
    advisor_id = UUID("cfad0fda-72e6-5474-9ec5-eecb3d065425")
    mock_goal = GoalRead(
        id=uuid4(),
        client_id=client_id,
        advisor_id=advisor_id,
        title="Aposentadoria aos 60 anos",
        target_amount=Decimal("3000000.00"),
        target_date=date(2045, 12, 31),
        status=GoalStatus.ACTIVE,
        notes="Plano de aportes mensais indexados à inflação",
        created_at=datetime.now(),
        updated_at=datetime.now(),
    )
    mock_goals_service.list_goals.return_value = [mock_goal]

    response = auth_goals_client.get(f"/api/v1/clients/{client_id}/goals")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    assert data[0]["title"] == "Aposentadoria aos 60 anos"
    assert data[0]["status"] == "active"
    assert data[0]["target_amount"] == "3000000.00"


def test_create_client_goal_success(
    auth_goals_client: TestClient,
    mock_goals_service: AsyncMock,
) -> None:
    client_id = uuid4()
    advisor_id = UUID("cfad0fda-72e6-5474-9ec5-eecb3d065425")
    mock_created = GoalRead(
        id=uuid4(),
        client_id=client_id,
        advisor_id=advisor_id,
        title="Compra de Imóvel Familiar",
        target_amount=Decimal("800000.00"),
        target_date=date(2030, 6, 15),
        status=GoalStatus.ACTIVE,
        notes=None,
        created_at=datetime.now(),
        updated_at=datetime.now(),
    )
    mock_goals_service.create_goal.return_value = mock_created

    payload = {
        "title": "Compra de Imóvel Familiar",
        "target_amount": "800000.00",
        "target_date": "2030-06-15",
    }
    response = auth_goals_client.post(f"/api/v1/clients/{client_id}/goals", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert data["title"] == "Compra de Imóvel Familiar"
    assert data["target_amount"] == "800000.00"


def test_get_goal_by_id_success(
    auth_goals_client: TestClient,
    mock_goals_service: AsyncMock,
) -> None:
    goal_id = uuid4()
    client_id = uuid4()
    advisor_id = UUID("cfad0fda-72e6-5474-9ec5-eecb3d065425")
    mock_goal = GoalRead(
        id=goal_id,
        client_id=client_id,
        advisor_id=advisor_id,
        title="Reserva de Emergência",
        target_amount=Decimal("150000.00"),
        status=GoalStatus.ACHIEVED,
        created_at=datetime.now(),
        updated_at=datetime.now(),
    )
    mock_goals_service.get_goal_by_id.return_value = mock_goal

    response = auth_goals_client.get(f"/api/v1/goals/{goal_id}")
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == str(goal_id)
    assert data["status"] == "achieved"


def test_get_goal_by_id_not_found(
    auth_goals_client: TestClient,
    mock_goals_service: AsyncMock,
) -> None:
    goal_id = uuid4()
    mock_goals_service.get_goal_by_id.side_effect = NotFoundError(
        "Objetivo não encontrado", code="GOAL_NOT_FOUND"
    )

    response = auth_goals_client.get(f"/api/v1/goals/{goal_id}")
    assert response.status_code == 404
    assert response.json()["error"]["code"] == "GOAL_NOT_FOUND"


def test_update_goal_success(
    auth_goals_client: TestClient,
    mock_goals_service: AsyncMock,
) -> None:
    goal_id = uuid4()
    client_id = uuid4()
    advisor_id = UUID("cfad0fda-72e6-5474-9ec5-eecb3d065425")
    mock_updated = GoalRead(
        id=goal_id,
        client_id=client_id,
        advisor_id=advisor_id,
        title="Aposentadoria Revisada",
        target_amount=Decimal("3500000.00"),
        status=GoalStatus.ACTIVE,
        created_at=datetime.now(),
        updated_at=datetime.now(),
    )
    mock_goals_service.update_goal.return_value = mock_updated

    payload = {"title": "Aposentadoria Revisada", "target_amount": "3500000.00"}
    response = auth_goals_client.patch(f"/api/v1/goals/{goal_id}", json=payload)
    assert response.status_code == 200
    assert response.json()["title"] == "Aposentadoria Revisada"


def test_delete_goal_success(
    auth_goals_client: TestClient,
    mock_goals_service: AsyncMock,
) -> None:
    goal_id = uuid4()
    mock_goals_service.delete_goal.return_value = None

    response = auth_goals_client.delete(f"/api/v1/goals/{goal_id}")
    assert response.status_code == 204
