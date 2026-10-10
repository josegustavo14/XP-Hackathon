"""Regra de concentração (issue #16): por emissor e por classe, limites vindos de configuração."""

from decimal import Decimal
from uuid import uuid4

import pytest

from app.features.alerts.rules import (
    DEMO_CONCENTRATION_CONFIG,
    ConcentrationLimits,
    ConcentrationPosition,
    ConcentrationRuleConfig,
    detect_concentrations,
)
from app.shared.enums import AssetClass, IssuerType

CLIENT_ID = uuid4()

# Limites fixos nos testes para não depender dos valores de demonstração
CONFIG = ConcentrationRuleConfig(
    issuer=ConcentrationLimits(threshold_pct=Decimal("25"), high_pct=Decimal("40")),
    asset_class=ConcentrationLimits(threshold_pct=Decimal("50"), high_pct=Decimal("70")),
)


def make_position(
    market_value: str,
    *,
    asset_class: AssetClass = AssetClass.FUNDS,
    issuer: str | None = None,
    issuer_type: IssuerType | None = IssuerType.BANK,
) -> ConcentrationPosition:
    return ConcentrationPosition(
        position_id=uuid4(),
        asset_class=asset_class,
        issuer=issuer,
        issuer_type=issuer_type if issuer else None,
        market_value=Decimal(market_value),
    )


def diversified(total: int, n: int = 10) -> list[ConcentrationPosition]:
    """Posições sem emissor espalhadas por classes, nenhuma acima dos limites."""
    classes = list(AssetClass)
    return [make_position(str(total // n), asset_class=classes[i % len(classes)]) for i in range(n)]


def detect(positions, config=CONFIG):
    return detect_concentrations(CLIENT_ID, positions, config=config)


def by_dimension(candidates, dimension: str):
    return [c for c in candidates if c.facts["dimension"] == dimension]


@pytest.mark.parametrize(
    ("issuer_value", "priority"),
    [
        ("25000", None),  # 25% = limite: não alerta
        ("25001", "medium"),
        ("39999", "medium"),
        ("40000", "high"),  # >= high_pct
        ("90000", "high"),
    ],
)
def test_issuer_priority_follows_configured_limits(issuer_value: str, priority: str | None):
    rest = 100000 - int(issuer_value)
    positions = [make_position(issuer_value, issuer="Emissor X"), *diversified(rest)]

    issuer_alerts = by_dimension(detect(positions), "issuer")

    if priority is None:
        assert issuer_alerts == []
    else:
        [candidate] = issuer_alerts
        assert candidate.priority == priority


def test_issuer_exposure_sums_positions_of_same_issuer():
    positions = [
        make_position("150000.00", issuer="Emissor X", asset_class=AssetClass.FIXED_INCOME),
        make_position("150000.00", issuer="Emissor X", asset_class=AssetClass.FUNDS),
        *diversified(700000),
    ]

    [candidate] = by_dimension(detect(positions), "issuer")

    assert candidate.facts["value"] == "Emissor X"
    assert candidate.facts["market_value"] == Decimal("300000.00")
    assert candidate.facts["value_pct"] == Decimal("30.00")


def test_government_issuer_is_ignored():
    positions = [
        make_position("900000", issuer="Tesouro Nacional", issuer_type=IssuerType.GOVERNMENT),
        *diversified(100000),
    ]

    assert by_dimension(detect(positions), "issuer") == []


def test_percentage_is_computed_from_market_value():
    # Total 1.000.000; Emissor X tem 420.000 → 42%, independente de qualquer % informado
    positions = [make_position("420000.00", issuer="Emissor X"), *diversified(580000)]

    [candidate] = by_dimension(detect(positions), "issuer")

    assert candidate.facts["value_pct"] == Decimal("42.00")


@pytest.mark.parametrize(
    ("class_value", "priority"),
    [("50000", None), ("50001", "medium"), ("70000", "high")],
)
def test_asset_class_priority_follows_configured_limits(class_value: str, priority: str | None):
    rest = 100000 - int(class_value)
    positions = [
        make_position(class_value, asset_class=AssetClass.FIXED_INCOME),
        make_position(str(rest), asset_class=AssetClass.EQUITIES),
    ]

    class_alerts = by_dimension(detect(positions), "asset_class")

    if priority is None:
        assert class_alerts == []
    else:
        [candidate] = class_alerts
        assert candidate.priority == priority
        assert candidate.facts["value"] == "fixed_income"


def test_issuer_and_class_concentrations_are_both_reported():
    positions = [
        make_position("800000", issuer="Emissor X", asset_class=AssetClass.FIXED_INCOME),
        make_position("200000", asset_class=AssetClass.CASH),
    ]

    candidates = detect(positions)

    assert {(c.type, c.facts["dimension"]) for c in candidates} == {
        ("issuer_concentration", "issuer"),
        ("asset_class_concentration", "asset_class"),
    }


def test_config_changes_the_result():
    positions = [make_position("300000", issuer="Emissor X"), *diversified(700000)]
    strict = ConcentrationRuleConfig(
        issuer=ConcentrationLimits(threshold_pct=Decimal("10"), high_pct=Decimal("20")),
        asset_class=CONFIG.asset_class,
    )
    lenient = ConcentrationRuleConfig(
        issuer=ConcentrationLimits(threshold_pct=Decimal("50"), high_pct=Decimal("80")),
        asset_class=CONFIG.asset_class,
    )

    [strict_alert] = by_dimension(detect(positions, strict), "issuer")
    assert strict_alert.priority == "high"
    assert strict_alert.facts["threshold_pct"] == Decimal("10")
    assert by_dimension(detect(positions, lenient), "issuer") == []


def test_empty_or_zero_portfolio_generates_no_alert():
    assert detect([]) == []
    assert detect([make_position("0", issuer="Emissor X")]) == []


def test_demo_config_is_the_default():
    positions = [make_position("420000.00", issuer="Emissor X"), *diversified(580000)]

    assert detect_concentrations(CLIENT_ID, positions) == detect(
        positions, DEMO_CONCENTRATION_CONFIG
    )


def test_candidate_follows_api_contract():
    positions = [make_position("420000.00", issuer="Emissor X"), *diversified(580000)]

    [candidate] = by_dimension(detect(positions), "issuer")

    assert candidate.model_dump(mode="json") == {
        "type": "issuer_concentration",
        "priority": "high",
        "client_id": str(CLIENT_ID),
        "title": "Concentração identificada",
        "facts": {
            "dimension": "issuer",
            "value": "Emissor X",
            "value_pct": "42.00",
            "threshold_pct": "25",
            "market_value": "420000.00",
        },
        "source_refs": [],
    }
