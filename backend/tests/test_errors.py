from fastapi.testclient import TestClient


def test_not_found_envelope(client: TestClient) -> None:
    response = client.get("/rota-inexistente")
    assert response.status_code == 404
    data = response.json()

    assert "error" in data
    assert data["error"]["code"] == "NOT_FOUND"
    assert "message" in data["error"]
    assert "trace_id" in data["error"]
    assert response.headers.get("X-Trace-Id") == data["error"]["trace_id"]


def test_auth_me_unauthorized_envelope(client: TestClient) -> None:
    response = client.get("/api/v1/auth/me")
    assert response.status_code == 401
    assert "WWW-Authenticate" in response.headers
    data = response.json()

    assert "error" in data
    assert data["error"]["code"] == "NOT_AUTHENTICATED"
    assert data["error"]["message"] == "Autenticação necessária."
    assert "trace_id" in data["error"]
    assert response.headers.get("X-Trace-Id") == data["error"]["trace_id"]
