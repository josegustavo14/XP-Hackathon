"""Testes de API da fatia "alertas" — derivados da especificação, não do código."""

from collections.abc import AsyncIterator
from datetime import UTC, datetime, timedelta
from types import SimpleNamespace
from typing import Any
from uuid import UUID, uuid4

import pytest
from fastapi.testclient import TestClient

from app.features.alerts.dependencies import get_alerts_service
from app.features.alerts.service import AlertService
from app.features.auth.dependencies import get_advisor_session, get_current_user
from app.features.auth.schemas import AuthenticatedUser

USER_ID = UUID("11111111-1111-4111-8111-111111111111")
CLIENT_A = UUID("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa")
CLIENT_B = UUID("bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb")
BASE_TIME = datetime(2026, 1, 10, 12, 0, tzinfo=UTC)
ALERT_KEYS = {
    "id",
    "client_id",
    "type",
    "priority",
    "status",
    "title",
    "explanation",
    "facts",
    "source_refs",
    "created_at",
    "reviewed_at",
}
HEADERS = {"Authorization": "Bearer x"}


def make_row(**overrides: Any) -> SimpleNamespace:
    data: dict[str, Any] = {
        "id": uuid4(),
        "client_id": CLIENT_A,
        "type": "issuer_concentration",
        "priority": "high",
        "status": "open",
        "title": "Concentração em emissor",
        "evidence": {"issuer": "Banco X", "share_pct": 42.5},
        "rule_description": "Mais de 30% da carteira em um único emissor.",
        "created_at": BASE_TIME,
        "reviewed_at": None,
        "reviewed_by": None,
    }
    data.update(overrides)
    return SimpleNamespace(**data)


class FakeAlertRepository:
    """Implementa a interface do repositório real; preserva a ordem recebida."""

    def __init__(self, rows: list[SimpleNamespace]) -> None:
        self.rows = rows

    async def list(
        self,
        *,
        client_id: UUID | None,
        type: str | None,  # noqa: A002
        priority: str | None,
        status: str | None,
        offset: int,
        limit: int,
    ) -> tuple[list[SimpleNamespace], int]:
        rows = [
            r
            for r in self.rows
            if (client_id is None or r.client_id == client_id)
            and (type is None or r.type == type)
            and (priority is None or r.priority == priority)
            and (status is None or r.status == status)
        ]
        return rows[offset : offset + limit], len(rows)

    async def get(self, alert_id: UUID) -> SimpleNamespace | None:
        return next((r for r in self.rows if r.id == alert_id), None)

    async def update_review(
        self, alert_id: UUID, *, status: str, reviewed_by: UUID, reviewed_at: datetime
    ) -> SimpleNamespace | None:
        row = await self.get(alert_id)
        if row is None:
            return None
        row.status = status
        row.reviewed_by = reviewed_by
        row.reviewed_at = reviewed_at
        return row


@pytest.fixture
def rows() -> list[SimpleNamespace]:
    # Já na ordem do repositório: prioridade high > medium > low, recente primeiro.
    return [
        make_row(priority="high", created_at=BASE_TIME),
        make_row(
            priority="high",
            type="idle_cash",
            client_id=CLIENT_B,
            created_at=BASE_TIME - timedelta(days=1),
        ),
        make_row(
            priority="medium",
            type="upcoming_maturity",
            created_at=BASE_TIME - timedelta(days=2),
        ),
        make_row(
            priority="low",
            type="low_diversification",
            status="dismissed",
            client_id=CLIENT_B,
            created_at=BASE_TIME - timedelta(days=3),
        ),
    ]


@pytest.fixture
def repo(rows: list[SimpleNamespace]) -> FakeAlertRepository:
    return FakeAlertRepository(rows)


async def _no_session() -> AsyncIterator[None]:
    yield None


@pytest.fixture
def api(client: TestClient, repo: FakeAlertRepository) -> TestClient:
    overrides = client.app.dependency_overrides
    overrides[get_current_user] = lambda: AuthenticatedUser(
        id=USER_ID, email="a@x.com", claims={}
    )
    overrides[get_advisor_session] = _no_session
    overrides[get_alerts_service] = lambda: AlertService(repo)
    client.headers.update(HEADERS)
    return client


# --- Listagem ---------------------------------------------------------------


def test_list_returns_items_and_meta(api: TestClient) -> None:
    response = api.get("/api/v1/alerts")
    assert response.status_code == 200
    body = response.json()
    assert len(body["items"]) == 4
    assert body["meta"]["page"] == 1
    assert body["meta"]["total"] == 4
    assert body["meta"]["total_pages"] == 1
    assert body["meta"]["page_size"] >= 1


def test_list_preserves_repository_order(
    api: TestClient, rows: list[SimpleNamespace]
) -> None:
    body = api.get("/api/v1/alerts").json()
    assert [i["id"] for i in body["items"]] == [str(r.id) for r in rows]


def test_list_filter_client_id(api: TestClient) -> None:
    body = api.get(f"/api/v1/alerts?client_id={CLIENT_B}").json()
    assert body["meta"]["total"] == 2
    assert {i["client_id"] for i in body["items"]} == {str(CLIENT_B)}


def test_list_filter_type(api: TestClient) -> None:
    body = api.get("/api/v1/alerts?type=idle_cash").json()
    assert body["meta"]["total"] == 1
    assert body["items"][0]["type"] == "idle_cash"


def test_list_filter_priority(api: TestClient) -> None:
    body = api.get("/api/v1/alerts?priority=high").json()
    assert body["meta"]["total"] == 2
    assert {i["priority"] for i in body["items"]} == {"high"}


def test_list_filter_severity_is_alias_of_priority(api: TestClient) -> None:
    body = api.get("/api/v1/alerts?severity=low").json()
    assert body["meta"]["total"] == 1
    assert body["items"][0]["priority"] == "low"


def test_list_filter_status(api: TestClient) -> None:
    body = api.get("/api/v1/alerts?status=dismissed").json()
    assert body["meta"]["total"] == 1
    assert body["items"][0]["status"] == "dismissed"


def test_list_pagination_second_page(
    api: TestClient, rows: list[SimpleNamespace]
) -> None:
    body = api.get("/api/v1/alerts?page=2&page_size=1").json()
    assert [i["id"] for i in body["items"]] == [str(rows[1].id)]
    assert body["meta"] == {"page": 2, "page_size": 1, "total": 4, "total_pages": 4}


@pytest.mark.parametrize(
    "query",
    [
        "status=foo",
        "type=foo",
        "priority=foo",
        "severity=foo",
        "client_id=not-a-uuid",
        "page_size=101",
    ],
)
def test_list_invalid_params_422(api: TestClient, query: str) -> None:
    response = api.get(f"/api/v1/alerts?{query}")
    assert response.status_code == 422
    assert response.json()["error"]["code"] == "VALIDATION_ERROR"


# --- Detalhe ----------------------------------------------------------------


def test_get_alert_200_and_exact_shape(
    api: TestClient, rows: list[SimpleNamespace]
) -> None:
    row = rows[0]
    response = api.get(f"/api/v1/alerts/{row.id}")
    assert response.status_code == 200
    body = response.json()
    assert set(body) == ALERT_KEYS
    assert body["id"] == str(row.id)
    assert body["client_id"] == str(row.client_id)
    assert body["type"] == "issuer_concentration"
    assert body["priority"] == "high"
    assert body["status"] == "open"
    assert body["title"] == row.title
    assert isinstance(body["explanation"], str) and body["explanation"].strip()
    assert isinstance(body["facts"], dict)
    assert body["facts"] == row.evidence
    assert {"type": "client", "id": str(row.client_id)} in body["source_refs"]
    assert datetime.fromisoformat(body["created_at"]) == BASE_TIME
    assert body["reviewed_at"] is None


def test_list_items_have_alert_shape(api: TestClient) -> None:
    for item in api.get("/api/v1/alerts").json()["items"]:
        assert set(item) == ALERT_KEYS


def test_get_alert_not_found_404(api: TestClient) -> None:
    response = api.get(f"/api/v1/alerts/{uuid4()}")
    assert response.status_code == 404
    assert response.json()["error"]["code"] == "NOT_FOUND"


def test_get_alert_invalid_id_422(api: TestClient) -> None:
    response = api.get("/api/v1/alerts/not-a-uuid")
    assert response.status_code == 422
    assert response.json()["error"]["code"] == "VALIDATION_ERROR"


# --- Revisão (PATCH) --------------------------------------------------------


@pytest.mark.parametrize("new_status", ["reviewed", "dismissed"])
def test_patch_sets_status_and_reviewed_at(
    api: TestClient, rows: list[SimpleNamespace], new_status: str
) -> None:
    row = rows[0]
    response = api.patch(f"/api/v1/alerts/{row.id}", json={"status": new_status})
    assert response.status_code == 200
    body = response.json()
    assert set(body) == ALERT_KEYS
    assert body["status"] == new_status
    assert body["reviewed_at"] is not None
    datetime.fromisoformat(body["reviewed_at"])


@pytest.mark.parametrize("bad_status", ["open", "resolved", "foo"])
def test_patch_invalid_status_422(
    api: TestClient, rows: list[SimpleNamespace], bad_status: str
) -> None:
    response = api.patch(f"/api/v1/alerts/{rows[0].id}", json={"status": bad_status})
    assert response.status_code == 422
    assert response.json()["error"]["code"] == "VALIDATION_ERROR"
    assert rows[0].status == "open"


def test_patch_not_found_404(api: TestClient) -> None:
    response = api.patch(f"/api/v1/alerts/{uuid4()}", json={"status": "reviewed"})
    assert response.status_code == 404
    assert response.json()["error"]["code"] == "NOT_FOUND"


def test_patch_does_not_delete_alert(
    api: TestClient, rows: list[SimpleNamespace]
) -> None:
    row = rows[0]
    api.patch(f"/api/v1/alerts/{row.id}", json={"status": "reviewed"})

    assert api.get(f"/api/v1/alerts/{row.id}").status_code == 200
    listed = api.get("/api/v1/alerts?status=reviewed").json()
    assert [i["id"] for i in listed["items"]] == [str(row.id)]


def test_patch_records_authenticated_user_as_reviewer(
    api: TestClient, rows: list[SimpleNamespace]
) -> None:
    row = rows[0]
    api.patch(f"/api/v1/alerts/{row.id}", json={"status": "reviewed"})
    assert row.reviewed_by == USER_ID


# --- Autenticação -----------------------------------------------------------


def test_requires_token_401(client: TestClient, repo: FakeAlertRepository) -> None:
    client.app.dependency_overrides[get_alerts_service] = lambda: AlertService(repo)
    alert_id = repo.rows[0].id
    calls = [
        client.get("/api/v1/alerts"),
        client.get(f"/api/v1/alerts/{alert_id}"),
        client.patch(f"/api/v1/alerts/{alert_id}", json={"status": "reviewed"}),
    ]
    for response in calls:
        assert response.status_code == 401
        assert response.json()["error"]["code"] == "NOT_AUTHENTICATED"
