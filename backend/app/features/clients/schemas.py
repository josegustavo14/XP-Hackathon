"""Schemas Pydantic (request/response) da feature clients (EP01/EP04)."""

from datetime import date, datetime
from decimal import Decimal
from typing import Any
from uuid import UUID

from pydantic import Field

from app.shared.enums import AlertPriority, RiskProfile
from app.shared.schemas import ApiModel


class ClientListItem(ApiModel):
    """Representação resumida de um cliente na listagem."""

    id: UUID
    name: str = Field(..., description="Nome completo do cliente")
    city: str | None = None
    state: str | None = None
    risk_profile: RiskProfile
    net_worth: Decimal | str = Field(default="0.00", description="Patrimônio consolidado")
    open_alerts: int = Field(default=0, description="Quantidade de alertas em aberto")
    institutions_count: int = Field(
        default=1, description="Quantidade de instituições com custódia"
    )
    next_contact_at: datetime | None = None
    primary_objective: str | None = Field(default=None, description="Objetivo principal declarado")


class ClientDetail(ApiModel):
    """Ficha 360º cadastral e patrimonial do cliente."""

    id: UUID
    advisor_id: UUID
    name: str = Field(..., description="Nome completo do cliente")
    birthday: date | None = None
    city: str | None = None
    state: str | None = None
    risk_profile: RiskProfile
    suitability_expires_at: date | None = None
    investment_horizon_yrs: int | None = None
    liquidity_need: str | None = None
    preferences: dict[str, Any] = Field(default_factory=dict)
    last_contact_at: datetime | None = None
    next_contact_at: datetime | None = None
    net_worth: Decimal | str | None = Field(default="0.00")
    net_worth_updated_at: datetime | None = None
    open_alerts: int = Field(default=0)
    institutions_count: int = Field(default=1)
    created_at: datetime
    updated_at: datetime


class DashboardPriorityClient(ApiModel):
    id: UUID
    name: str
    risk_profile: RiskProfile
    total_assets: Decimal | str | None = None


class DashboardPriorityItem(ApiModel):
    client: DashboardPriorityClient
    reason_type: str
    reason_label: str
    severity: AlertPriority
    alert_id: UUID | None = None


class DashboardSummary(ApiModel):
    """Métricas consolidadas e prioridades para a página inicial do assessor."""

    clients_total: int = Field(ge=0)
    clients_need_attention: int = Field(ge=0)
    open_alerts: int = Field(ge=0)
    total_assets: Decimal | str = Field(default="0.00")
    priorities: list[DashboardPriorityItem] = Field(default_factory=list)
