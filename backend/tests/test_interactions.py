from datetime import UTC, datetime
from unittest.mock import AsyncMock
from uuid import UUID, uuid4

import pytest
from fastapi.testclient import TestClient

from app.features.auth.dependencies import get_current_user
from app.features.auth.schemas import AuthenticatedUser
from app.features.interactions.dependencies import get_interactions_service
from app.features.interactions.schemas import (
    ActionItemRead,
    InteractionRead,
    InteractionSearchItem,
)
from app.features.interactions.service import InteractionService
from app.main import create_app
from app.shared.enums import InteractionChannel
from app.shared.exceptions import NotFoundError
from app.shared.schemas import Page, PageMeta


def test_list_interactions_unauthorized(client: TestClient) -> None:
    response = client.get("/api/v1/interactions")
    assert response.status_code == 401
    data = response.json()
    assert data["error"]["code"] == "NOT_AUTHENTICATED"


def test_create_interaction_unauthorized(client: TestClient) -> None:
    response = client.post(
        "/api/v1/interactions",
        json={
            "client_id": str(uuid4()),
            "channel": "meeting",
            "summary": "Reunião de alinhamento",
        },
    )
    assert response.status_code == 401
    data = response.json()
    assert data["error"]["code"] == "NOT_AUTHENTICATED"


@pytest.fixture
def mock_interaction_service() -> InteractionService:
    service = AsyncMock(spec=InteractionService)
    return service


@pytest.fixture
def auth_interaction_client(mock_interaction_service: InteractionService) -> TestClient:
    app = create_app()
    advisor_id = UUID("cfad0fda-72e6-5474-9ec5-eecb3d065425")
    user = AuthenticatedUser(
        id=advisor_id,
        email="assessor.teste@xp.com.br",
        claims={"sub": str(advisor_id), "role": "authenticated"},
    )
    app.dependency_overrides[get_current_user] = lambda: user
    app.dependency_overrides[get_interactions_service] = lambda: mock_interaction_service
    return TestClient(app)


def test_list_interactions_success(
    auth_interaction_client: TestClient,
    mock_interaction_service: AsyncMock,
) -> None:
    client_id = uuid4()
    advisor_id = UUID("cfad0fda-72e6-5474-9ec5-eecb3d065425")
    mock_item = InteractionRead(
        id=uuid4(),
        client_id=client_id,
        advisor_id=advisor_id,
        occurred_at=datetime.now(UTC),
        channel=InteractionChannel.MEETING,
        summary="Reunião anual de alocação patrimonial",
        decisions="Aumentar posição em IPCA+",
        created_at=datetime.now(UTC),
        action_items=[
            ActionItemRead(
                id=uuid4(),
                client_id=client_id,
                description="Enviar proposta de títulos até sexta",
                created_at=datetime.now(UTC),
            )
        ],
    )
    mock_interaction_service.list_interactions.return_value = Page(
        items=[mock_item],
        meta=PageMeta.build(page=1, page_size=25, total=1),
    )

    response = auth_interaction_client.get(f"/api/v1/interactions?client_id={client_id}")
    assert response.status_code == 200
    data = response.json()
    assert len(data["items"]) == 1
    assert data["items"][0]["summary"] == "Reunião anual de alocação patrimonial"
    assert data["items"][0]["channel"] == "meeting"
    assert len(data["items"][0]["action_items"]) == 1


def test_create_interaction_success(
    auth_interaction_client: TestClient,
    mock_interaction_service: AsyncMock,
) -> None:
    client_id = uuid4()
    advisor_id = UUID("cfad0fda-72e6-5474-9ec5-eecb3d065425")
    mock_created = InteractionRead(
        id=uuid4(),
        client_id=client_id,
        advisor_id=advisor_id,
        occurred_at=datetime.now(UTC),
        channel=InteractionChannel.CALL,
        summary="Contato telefônico sobre liquidez imediata",
        decisions="Manter reserva em CDI",
        created_at=datetime.now(UTC),
        action_items=[],
    )
    mock_interaction_service.create_interaction.return_value = mock_created

    payload = {
        "client_id": str(client_id),
        "channel": "call",
        "summary": "Contato telefônico sobre liquidez imediata",
        "decisions": "Manter reserva em CDI",
    }
    response = auth_interaction_client.post("/api/v1/interactions", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert data["summary"] == "Contato telefônico sobre liquidez imediata"
    assert data["channel"] == "call"


def test_get_interaction_by_id_success(
    auth_interaction_client: TestClient,
    mock_interaction_service: AsyncMock,
) -> None:
    interaction_id = uuid4()
    client_id = uuid4()
    advisor_id = UUID("cfad0fda-72e6-5474-9ec5-eecb3d065425")
    mock_item = InteractionRead(
        id=interaction_id,
        client_id=client_id,
        advisor_id=advisor_id,
        occurred_at=datetime.now(UTC),
        channel=InteractionChannel.WHATSAPP,
        summary="Troca de mensagens sobre fundos",
        created_at=datetime.now(UTC),
    )
    mock_interaction_service.get_interaction_by_id.return_value = mock_item

    response = auth_interaction_client.get(f"/api/v1/interactions/{interaction_id}")
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == str(interaction_id)
    assert data["channel"] == "whatsapp"


def test_get_interaction_by_id_not_found(
    auth_interaction_client: TestClient,
    mock_interaction_service: AsyncMock,
) -> None:
    interaction_id = uuid4()
    mock_interaction_service.get_interaction_by_id.side_effect = NotFoundError(
        "Atendimento não encontrado", code="INTERACTION_NOT_FOUND"
    )

    response = auth_interaction_client.get(f"/api/v1/interactions/{interaction_id}")
    assert response.status_code == 404
    data = response.json()
    assert data["error"]["code"] == "INTERACTION_NOT_FOUND"


def test_search_interactions_success(
    auth_interaction_client: TestClient,
    mock_interaction_service: AsyncMock,
) -> None:
    client_id = uuid4()
    advisor_id = UUID("cfad0fda-72e6-5474-9ec5-eecb3d065425")
    mock_item = InteractionRead(
        id=uuid4(),
        client_id=client_id,
        advisor_id=advisor_id,
        occurred_at=datetime.now(UTC),
        channel=InteractionChannel.EMAIL,
        summary="Relatório de rentabilidade mensal enviado",
        created_at=datetime.now(UTC),
    )
    mock_interaction_service.search_interactions.return_value = [
        InteractionSearchItem(interaction=mock_item, score=0.95)
    ]

    response = auth_interaction_client.get("/api/v1/interactions/search?q=rentabilidade")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    assert data[0]["score"] == 0.95
    assert data[0]["interaction"]["summary"] == "Relatório de rentabilidade mensal enviado"


def test_client_scoped_interactions_endpoints(
    auth_interaction_client: TestClient,
    mock_interaction_service: AsyncMock,
) -> None:
    client_id = uuid4()
    advisor_id = UUID("cfad0fda-72e6-5474-9ec5-eecb3d065425")
    mock_item = InteractionRead(
        id=uuid4(),
        client_id=client_id,
        advisor_id=advisor_id,
        occurred_at=datetime.now(UTC),
        channel=InteractionChannel.MEETING,
        summary="Reunião presencial",
        created_at=datetime.now(UTC),
    )
    mock_interaction_service.list_interactions.return_value = Page(
        items=[mock_item],
        meta=PageMeta.build(page=1, page_size=25, total=1),
    )
    mock_interaction_service.create_interaction.return_value = mock_item

    # GET /clients/{client_id}/interactions
    get_res = auth_interaction_client.get(f"/api/v1/clients/{client_id}/interactions")
    assert get_res.status_code == 200
    assert len(get_res.json()["items"]) == 1

    # POST /clients/{client_id}/interactions
    post_res = auth_interaction_client.post(
        f"/api/v1/clients/{client_id}/interactions",
        json={
            "client_id": str(client_id),
            "channel": "meeting",
            "summary": "Reunião presencial",
        },
    )
    assert post_res.status_code == 201
    assert post_res.json()["summary"] == "Reunião presencial"
