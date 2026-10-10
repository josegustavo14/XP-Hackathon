"""Regras determinísticas que geram `AlertCandidate` a partir da carteira.

Funções puras: recebem os dados e a data de referência, sem I/O.
"""

from collections.abc import Iterable
from dataclasses import dataclass
from datetime import date
from decimal import Decimal
from uuid import UUID

from app.features.alerts.schemas import AlertCandidate
from app.shared.enums import AlertPriority, AlertType

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
