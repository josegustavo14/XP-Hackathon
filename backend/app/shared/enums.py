"""Enums do domínio — espelho 1:1 dos `create type` do schema.sql.

Fonte única no backend (issue #39). Não duplicar estas strings nas features.
"""

from enum import StrEnum


class RiskProfile(StrEnum):
    """Perfil de suitability (Resolução CVM 30)."""

    CONSERVATIVE = "conservative"
    MODERATE = "moderate"
    AGGRESSIVE = "aggressive"


class AssetClass(StrEnum):
    CASH = "cash"
    FIXED_INCOME = "fixed_income"
    EQUITIES = "equities"
    FUNDS = "funds"
    REAL_ESTATE = "real_estate"
    PENSION = "pension"
    INTERNATIONAL = "international"
    CRYPTO = "crypto"


class IssuerType(StrEnum):
    GOVERNMENT = "government"
    BANK = "bank"
    COMPANY = "company"
    FUND_MANAGER = "fund_manager"


class DataSource(StrEnum):
    """Origem do dado: interno XP ou externo autorizado via Open Finance."""

    XP = "xp"
    OPEN_FINANCE = "open_finance"


class AlertType(StrEnum):
    ISSUER_CONCENTRATION = "issuer_concentration"
    UPCOMING_MATURITY = "upcoming_maturity"
    IDLE_CASH = "idle_cash"
    SUITABILITY_MISMATCH = "suitability_mismatch"
    LOW_DIVERSIFICATION = "low_diversification"
    ASSET_CLASS_CONCENTRATION = "asset_class_concentration"
    SUITABILITY_EXPIRING = "suitability_expiring"


class AlertPriority(StrEnum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"


class AlertStatus(StrEnum):
    OPEN = "open"
    REVIEWED = "reviewed"
    DISMISSED = "dismissed"
    RESOLVED = "resolved"


class InteractionChannel(StrEnum):
    MEETING = "meeting"
    CALL = "call"
    WHATSAPP = "whatsapp"
    EMAIL = "email"


class GoalStatus(StrEnum):
    ACTIVE = "active"
    ACHIEVED = "achieved"
    CANCELLED = "cancelled"


class ConsentStatus(StrEnum):
    ACTIVE = "active"
    REVOKED = "revoked"
    EXPIRED = "expired"


class BriefingStatus(StrEnum):
    DRAFT = "draft"
    REVIEWED = "reviewed"
    USED = "used"
    DISCARDED = "discarded"


class AiLogKind(StrEnum):
    CHAT = "chat"
    BRIEFING = "briefing"
    ALERT_EXPLANATION = "alert_explanation"


class NewsMatchType(StrEnum):
    """Vínculo determinístico entre uma notícia e uma carteira."""

    HOLDS_ASSET = "holds_asset"
    ISSUER_EXPOSURE = "issuer_exposure"
    ASSET_CLASS = "asset_class"
    MACRO = "macro"
