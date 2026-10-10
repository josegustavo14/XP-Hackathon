"""Regras determinísticas que geram `AlertCandidate` a partir da carteira.

Funções puras: recebem os dados e a data de referência, sem I/O.
"""

from collections.abc import Iterable
from collections import defaultdict
from collections.abc import Callable, Iterable
from dataclasses import dataclass
from datetime import date
from decimal import Decimal
from uuid import UUID

from app.features.alerts.schemas import AlertCandidate
from app.shared.enums import AlertPriority, AlertType
from app.shared.enums import AlertPriority, AlertType, AssetClass, IssuerType

# Janelas demonstrativas (dias até o vencimento → prioridade), da mais urgente
# para a menos. A regra real de prioridade ainda precisa ser validada com o assessor.
MATURITY_WINDOWS: tuple[tuple[int, AlertPriority], ...] = (
    (7, AlertPriority.HIGH),
    (15, AlertPriority.MEDIUM),
    (30, AlertPriority.LOW),
)

MATURITY_ALERT_TITLE = "Investimento próximo do vencimento"


@dataclass(frozen=True)
class MaturityPosition:
    position_id: UUID
    client_id: UUID
    maturity_date: date | None
    market_value: Decimal


def _maturity_priority(days_to_maturity: int) -> AlertPriority | None:
    if days_to_maturity < 0:
        return None
    for max_days, priority in MATURITY_WINDOWS:
        if days_to_maturity <= max_days:
            return priority
    return None


def detect_upcoming_maturities(
    positions: Iterable[MaturityPosition], *, today: date
) -> list[AlertCandidate]:
    """Um candidato por posição que vence nos próximos 30 dias (inclui hoje)."""
    candidates: list[AlertCandidate] = []
    for position in positions:
        if position.maturity_date is None:
            continue
        days_to_maturity = (position.maturity_date - today).days
        priority = _maturity_priority(days_to_maturity)
        if priority is None:
            continue
        candidates.append(
            AlertCandidate(
                type=AlertType.UPCOMING_MATURITY,
                priority=priority,
                client_id=position.client_id,
                title=MATURITY_ALERT_TITLE,
                facts={
                    "position_id": position.position_id,
                    "maturity_date": position.maturity_date,
                    "days_to_maturity": days_to_maturity,
                    "market_value": position.market_value,
                },
            )
        )
    return candidates


# ---------------------------------------------------------------------------
# Concentração por emissor e por classe (issue #16)
# ---------------------------------------------------------------------------

CONCENTRATION_ALERT_TITLE = "Concentração identificada"


@dataclass(frozen=True)
class ConcentrationLimits:
    """Percentuais (0–100) da carteira: acima de `threshold_pct` alerta; a partir de
    `high_pct` a prioridade é alta."""

    threshold_pct: Decimal
    high_pct: Decimal


@dataclass(frozen=True)
class ConcentrationRuleConfig:
    issuer: ConcentrationLimits
    asset_class: ConcentrationLimits


# VALORES FICTÍCIOS DE DEMONSTRAÇÃO — limites e critério de prioridade ainda não
# validados com assessor/compliance. Emissor espelha `alert_rules.issuer_concentration`
# (0.25 / 0.40); classe espelha `alert_rules.asset_class_concentration` (0.50 / 0.70).
DEMO_CONCENTRATION_CONFIG = ConcentrationRuleConfig(
    issuer=ConcentrationLimits(threshold_pct=Decimal("25"), high_pct=Decimal("40")),
    asset_class=ConcentrationLimits(threshold_pct=Decimal("50"), high_pct=Decimal("70")),
)

_PCT_PLACES = Decimal("0.01")


@dataclass(frozen=True)
class ConcentrationPosition:
    position_id: UUID
    asset_class: AssetClass
    issuer: str | None
    issuer_type: IssuerType | None
    market_value: Decimal


def _concentration_priority(pct: Decimal, limits: ConcentrationLimits) -> AlertPriority | None:
    if pct >= limits.high_pct:
        return AlertPriority.HIGH
    if pct > limits.threshold_pct:
        return AlertPriority.MEDIUM
    return None


def _detect_by(
    client_id: UUID,
    positions: list[ConcentrationPosition],
    total: Decimal,
    *,
    key: Callable[[ConcentrationPosition], str | None],
    alert_type: AlertType,
    dimension: str,
    limits: ConcentrationLimits,
) -> list[AlertCandidate]:
    exposure: dict[str, Decimal] = defaultdict(Decimal)
    for position in positions:
        group = key(position)
        if group is not None:
            exposure[group] += position.market_value

    candidates: list[AlertCandidate] = []
    for group, value in exposure.items():
        # Compara com o valor exato; o arredondamento é só para exibição
        pct = value / total * 100
        priority = _concentration_priority(pct, limits)
        if priority is None:
            continue
        candidates.append(
            AlertCandidate(
                type=alert_type,
                priority=priority,
                client_id=client_id,
                title=CONCENTRATION_ALERT_TITLE,
                facts={
                    "dimension": dimension,
                    "value": group,
                    "value_pct": pct.quantize(_PCT_PLACES),
                    "threshold_pct": limits.threshold_pct,
                    "market_value": value,
                },
            )
        )
    return candidates


def _private_issuer(position: ConcentrationPosition) -> str | None:
    # Título público (Tesouro) não conta como risco de emissor, igual a `refresh_alerts()`
    if position.issuer_type == IssuerType.GOVERNMENT:
        return None
    return position.issuer


def detect_concentrations(
    client_id: UUID,
    positions: Iterable[ConcentrationPosition],
    *,
    config: ConcentrationRuleConfig = DEMO_CONCENTRATION_CONFIG,
) -> list[AlertCandidate]:
    """Um candidato por emissor privado e por classe acima do limite configurado.

    O percentual é calculado aqui a partir de `market_value`, somando posições do mesmo grupo.
    """
    positions = list(positions)
    total = sum((p.market_value for p in positions), Decimal(0))
    if total <= 0:
        return []
    return [
        *_detect_by(
            client_id,
            positions,
            total,
            key=_private_issuer,
            alert_type=AlertType.ISSUER_CONCENTRATION,
            dimension="issuer",
            limits=config.issuer,
        ),
        *_detect_by(
            client_id,
            positions,
            total,
            key=lambda p: p.asset_class.value,
            alert_type=AlertType.ASSET_CLASS_CONCENTRATION,
            dimension="asset_class",
            limits=config.asset_class,
        ),
    ]
