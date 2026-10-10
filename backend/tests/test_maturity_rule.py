"""Regra de vencimentos próximos (issue #17): janelas de 7, 15 e 30 dias."""

from datetime import date, timedelta
from decimal import Decimal
from uuid import uuid4

import pytest

from app.features.alerts.rules import MaturityPosition, detect_upcoming_maturities

TODAY = date(2026, 10, 10)


def make_position(days_to_maturity: int | None, market_value: str = "180000.00"):
    maturity_date = None if days_to_maturity is None else TODAY + timedelta(days=days_to_maturity)
    return MaturityPosition(
        position_id=uuid4(),
        client_id=uuid4(),
        maturity_date=maturity_date,
        market_value=Decimal(market_value),
    )


@pytest.mark.parametrize(
    ("days", "priority"),
    [
        (0, "high"),
        (1, "high"),
        (7, "high"),
        (8, "medium"),
        (15, "medium"),
        (16, "low"),
        (30, "low"),
    ],
)
def test_priority_follows_demo_windows(days: int, priority: str) -> None:
    [candidate] = detect_upcoming_maturities([make_position(days)], today=TODAY)

    assert candidate.priority == priority


@pytest.mark.parametrize("days", [31, 365, -1, None])
def test_positions_outside_window_generate_no_alert(days: int | None) -> None:
    assert detect_upcoming_maturities([make_position(days)], today=TODAY) == []


def test_candidate_follows_api_contract() -> None:
    position = make_position(7)

    [candidate] = detect_upcoming_maturities([position], today=TODAY)

    assert candidate.model_dump(mode="json") == {
        "type": "upcoming_maturity",
        "priority": "high",
        "client_id": str(position.client_id),
        "title": "Investimento próximo do vencimento",
        "facts": {
            "position_id": str(position.position_id),
            "maturity_date": "2026-10-17",
            "days_to_maturity": 7,
            "market_value": "180000.00",
        },
        "source_refs": [],
    }


def test_one_candidate_per_position_in_window() -> None:
    positions = [make_position(3), make_position(None), make_position(20), make_position(90)]

    candidates = detect_upcoming_maturities(positions, today=TODAY)

    assert [c.facts["position_id"] for c in candidates] == [
        positions[0].position_id,
        positions[2].position_id,
    ]
