from decimal import Decimal
from unittest.mock import AsyncMock
from uuid import UUID, uuid4

import pytest
from fastapi.testclient import TestClient

from app.features.auth.dependencies import get_current_user
from app.features.auth.schemas import AuthenticatedUser
from app.features.clients.dependencies import get_clients_service
from app.features.clients.schemas import (
    ClientDetail,
    ClientListItem,
    DashboardPriorityClient,
    DashboardPriorityItem,
    DashboardSummary,
)
from app.features.clients.service import ClientService
from app.main import create_app
from app.shared.enums import AlertPriority, RiskProfile
from app.shared.exceptions import NotFoundError
from app.shared.schemas import Page, PageMeta


def test_list_clients_unauthorized(client: TestClient) -> None:
    response = client.get("/api/v1/clients")
    assert response.status_code == 401
    data = response.json()
    assert data["error"]["code"] == "NOT_AUTHENTICATED"


def test_get_client_by_id_unauthorized(client: TestClient) -> None:
    response = client.get(f"/api/v1/clients/{uuid4()}")
    assert response.status_code == 401
    data = response.json()
    assert data["error"]["code"] == "NOT_AUTHENTICATED"


def test_dashboard_summary_unauthorized(client: TestClient) -> None:
    response = client.get("/api/v1/dashboard/summary")
    assert response.status_code == 401
    data = response.json()
    assert data["error"]["code"] == "NOT_AUTHENTICATED"


@pytest.fixture
def mock_client_service() -> ClientService:
    service = AsyncMock(spec=ClientService)
    return service


@pytest.fixture
def auth_client(mock_client_service: ClientService) -> TestClient:
    app = create_app()
    advisor_id = UUID("cfad0fda-72e6-5474-9ec5-eecb3d065425")
    user = AuthenticatedUser(
        id=advisor_id,
        email="ana.souza@demo.xpcopilot.dev",
        claims={"sub": str(advisor_id), "role": "authenticated"},
    )
    app.dependency_overrides[get_current_user] = lambda: user
    app.dependency_overrides[get_clients_service] = lambda: mock_client_service

    with TestClient(app) as test_client:
        yield test_client


def test_list_clients_success(auth_client: TestClient, mock_client_service: AsyncMock) -> None:
    client_id = uuid4()
    mock_items = [
        ClientListItem(
            id=client_id,
            name="Mariana Costa",
            city="Campinas",
            state="SP",
            risk_profile=RiskProfile.MODERATE,
            net_worth=Decimal("1280000.00"),
            open_alerts=2,
            institutions_count=3,
            primary_objective="Aposentadoria em 2045",
        )
    ]
    mock_page = Page(
        items=mock_items,
        meta=PageMeta.build(page=1, page_size=25, total=1),
    )
    mock_client_service.list_clients.return_value = mock_page

    url = "/api/v1/clients?search=mariana&risk_profile=moderate&page=1&page_size=25"
    response = auth_client.get(url)
    assert response.status_code == 200
    data = response.json()

    assert len(data["items"]) == 1
    assert data["items"][0]["id"] == str(client_id)
    assert data["items"][0]["name"] == "Mariana Costa"
    assert data["items"][0]["risk_profile"] == "moderate"
    assert data["items"][0]["open_alerts"] == 2
    assert data["meta"]["total"] == 1
    assert data["meta"]["page"] == 1

    mock_client_service.list_clients.assert_called_once_with(
        advisor_id=UUID("cfad0fda-72e6-5474-9ec5-eecb3d065425"),
        search="mariana",
        risk_profile=RiskProfile.MODERATE,
        page=1,
        page_size=25,
    )


def test_get_client_by_id_success(auth_client: TestClient, mock_client_service: AsyncMock) -> None:
    client_id = uuid4()
    advisor_id = UUID("cfad0fda-72e6-5474-9ec5-eecb3d065425")
    mock_detail = ClientDetail(
        id=client_id,
        advisor_id=advisor_id,
        name="Ricardo Almeida",
        city="Ribeirão Preto",
        state="SP",
        risk_profile=RiskProfile.CONSERVATIVE,
        net_worth=Decimal("740000.00"),
        open_alerts=1,
        institutions_count=2,
        liquidity_need="Proteção patrimonial",
        created_at="2026-01-01T10:00:00Z",
        updated_at="2026-01-01T10:00:00Z",
    )
    mock_client_service.get_client_by_id.return_value = mock_detail

    response = auth_client.get(f"/api/v1/clients/{client_id}")
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == str(client_id)
    assert data["name"] == "Ricardo Almeida"
    assert data["risk_profile"] == "conservative"
    assert data["open_alerts"] == 1


def test_get_client_by_id_not_found(
    auth_client: TestClient, mock_client_service: AsyncMock
) -> None:
    client_id = uuid4()
    mock_client_service.get_client_by_id.side_effect = NotFoundError(
        "Cliente não encontrado.", code="CLIENT_NOT_FOUND"
    )

    response = auth_client.get(f"/api/v1/clients/{client_id}")
    assert response.status_code == 404
    data = response.json()
    assert data["error"]["code"] == "CLIENT_NOT_FOUND"


def test_get_dashboard_summary_success(
    auth_client: TestClient, mock_client_service: AsyncMock
) -> None:
    client_id = uuid4()
    alert_id = uuid4()
    mock_summary = DashboardSummary(
        clients_total=142,
        clients_need_attention=7,
        open_alerts=7,
        total_assets=Decimal("48200000.00"),
        priorities=[
            DashboardPriorityItem(
                client=DashboardPriorityClient(
                    id=client_id,
                    name="Mariana Costa",
                    risk_profile=RiskProfile.MODERATE,
                    total_assets=Decimal("1280000.00"),
                ),
                reason_type="issuer_concentration",
                reason_label="Exposição elevada a crédito privado (42%)",
                severity=AlertPriority.HIGH,
                alert_id=alert_id,
            )
        ],
    )
    mock_client_service.get_dashboard_summary.return_value = mock_summary

    response = auth_client.get("/api/v1/dashboard/summary")
    assert response.status_code == 200
    data = response.json()
    assert data["clients_total"] == 142
    assert data["open_alerts"] == 7
    assert len(data["priorities"]) == 1
    assert data["priorities"][0]["client"]["name"] == "Mariana Costa"
    assert data["priorities"][0]["severity"] == "high"


def test_get_clients_dashboard_summary_alias(
    auth_client: TestClient, mock_client_service: AsyncMock
) -> None:
    mock_summary = DashboardSummary(
        clients_total=10,
        clients_need_attention=2,
        open_alerts=2,
        total_assets=Decimal("5000000.00"),
        priorities=[],
    )
    mock_client_service.get_dashboard_summary.return_value = mock_summary

    response = auth_client.get("/api/v1/clients/dashboard/summary")
    assert response.status_code == 200
    data = response.json()
    assert data["clients_total"] == 10
