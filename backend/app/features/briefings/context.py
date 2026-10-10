"""Dados permitidos no briefing (issue #26), independentes de quem gera o texto.

O repository preenche; o compositor por regras (e, depois, a IA) consome.
"""

from dataclasses import dataclass
from datetime import date, datetime
from decimal import Decimal
from uuid import UUID

from app.shared.enums import AlertPriority, AlertType, InteractionChannel, RiskProfile


@dataclass(frozen=True, slots=True)
class ClientFacts:
    id: UUID
    name: str
    risk_profile: RiskProfile
    investment_horizon_yrs: int | None
    liquidity_need: str | None
    suitability_expires_at: date | None
    last_contact_at: datetime | None
    updated_at: datetime | None


@dataclass(frozen=True, slots=True)
class AlertFacts:
    id: UUID
    type: AlertType
    priority: AlertPriority
    title: str
    updated_at: datetime | None


@dataclass(frozen=True, slots=True)
class GoalFacts:
    id: UUID
    title: str
    target_amount: Decimal | None
    target_date: date | None


@dataclass(frozen=True, slots=True)
class InteractionFacts:
    id: UUID
    occurred_at: datetime
    channel: InteractionChannel
    summary: str


@dataclass(frozen=True, slots=True)
class PendingItemFacts:
    id: UUID
    description: str
    due_date: date | None


@dataclass(frozen=True, slots=True)
class NewsFacts:
    id: UUID
    title: str
    published_at: datetime
    explanation: str | None


@dataclass(frozen=True, slots=True)
class BriefingContext:
    client: ClientFacts
    portfolio_total: Decimal
    allocation: dict[str, Decimal]
    alerts: list[AlertFacts]
    goals: list[GoalFacts]
    interactions: list[InteractionFacts]
    pending_items: list[PendingItemFacts]
    news: list[NewsFacts]
    meeting_context: str | None
