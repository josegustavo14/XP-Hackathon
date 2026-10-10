from fastapi.testclient import TestClient


def test_health_check_root(client: TestClient) -> None:
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}
    assert "X-Trace-Id" in response.headers


def test_health_check_api_v1(client: TestClient) -> None:
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}
    assert "X-Trace-Id" in response.headers
