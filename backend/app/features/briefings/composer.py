"""Compositor determinístico do briefing (sem IA).

`compose_briefing` monta o texto só com fatos do banco; quando a integração com
LLM entrar, continua como fallback. `collect_sources` independe de quem gera o
texto: as fontes rastreáveis sempre vêm do banco.
"""

from datetime import date, datetime, timedelta, timezone
from decimal import Decimal

from app.features.briefings.context import AlertFacts, BriefingContext, GoalFacts
from app.features.briefings.schemas import BriefingContent, BriefingTopic, SourceRef
from app.shared.enums import AlertPriority, AlertType, InteractionChannel, RiskProfile

# O banco devolve timestamptz em UTC; datas exibidas seguem o horário de Brasília.
# Offset fixo (sem horário de verão desde 2019) evita depender do pacote tzdata no Windows.
DISPLAY_TZ = timezone(timedelta(hours=-3), "BRT")

DEFAULT_QUESTION = "Os objetivos e o horizonte permanecem os mesmos?"

RISK_PROFILE_LABELS: dict[RiskProfile, str] = {
    RiskProfile.CONSERVATIVE: "conservador",
    RiskProfile.MODERATE: "moderado",
    RiskProfile.AGGRESSIVE: "arrojado",
}

ASSET_CLASS_LABELS: dict[str, str] = {
    "cash": "caixa",
    "fixed_income": "renda fixa",
    "equities": "renda variável",
    "funds": "fundos",
    "real_estate": "imobiliário",
    "pension": "previdência",
    "international": "internacional",
    "crypto": "cripto",
}

CHANNEL_LABELS: dict[InteractionChannel, str] = {
    InteractionChannel.MEETING: "reunião",
    InteractionChannel.CALL: "ligação",
    InteractionChannel.WHATSAPP: "WhatsApp",
    InteractionChannel.EMAIL: "e-mail",
}

# Tópico e pergunta sugerida por tipo de alerta
ALERT_TOPICS: dict[AlertType, tuple[str, str]] = {
    AlertType.ISSUER_CONCENTRATION: (
        "Concentração por emissor",
        "Você está confortável com a exposição atual a esse emissor?",
    ),
    AlertType.ASSET_CLASS_CONCENTRATION: (
        "Concentração por classe",
        "Faz sentido diversificar parte da carteira em outras classes de ativos?",
    ),
    AlertType.UPCOMING_MATURITY: (
        "Vencimentos próximos",
        "Já pensou no destino dos recursos que vão vencer?",
    ),
    AlertType.IDLE_CASH: (
        "Caixa parado",
        "Esse saldo em conta tem algum uso previsto no curto prazo?",
    ),
    AlertType.SUITABILITY_MISMATCH: (
        "Desenquadramento de perfil",
        "Sua tolerância a risco mudou desde o último questionário de perfil?",
    ),
    AlertType.LOW_DIVERSIFICATION: (
        "Baixa diversificação",
        "Podemos avaliar alternativas para diversificar a carteira?",
    ),
    AlertType.SUITABILITY_EXPIRING: (
        "Suitability a vencer",
        "Podemos atualizar seu questionário de perfil de investidor?",
    ),
}

PRIORITY_ORDER: dict[AlertPriority, int] = {
    AlertPriority.HIGH: 0,
    AlertPriority.MEDIUM: 1,
    AlertPriority.LOW: 2,
}


def format_brl(value: Decimal) -> str:
    """Formata em reais (pt-BR) sem passar por float: 1280000.1 -> 'R$ 1.280.000,10'."""
    us = f"{abs(value).quantize(Decimal('0.01')):,.2f}"
    brl = "R$ " + us.replace(",", "_").replace(".", ",").replace("_", ".")
    return f"-{brl}" if value < 0 else brl


def format_date(value: date | datetime) -> str:
    if isinstance(value, datetime) and value.tzinfo is not None:
        value = value.astimezone(DISPLAY_TZ)
    return value.strftime("%d/%m/%Y")


def compose_briefing(ctx: BriefingContext) -> BriefingContent:
    alerts = _by_priority(ctx.alerts)
    return BriefingContent(
        summary=_summary(ctx, alerts),
        topics=_topics(ctx, alerts),
        suggested_questions=_questions(alerts),
    )


def collect_sources(ctx: BriefingContext) -> list[SourceRef]:
    client = ctx.client
    sources = [
        SourceRef(type="client", id=client.id, label=client.name, updated_at=client.updated_at)
    ]
    sources += [
        SourceRef(type="alert", id=a.id, label=a.title, updated_at=a.updated_at)
        for a in _by_priority(ctx.alerts)
    ]
    sources += [
        SourceRef(
            type="interaction",
            id=i.id,
            label=f"{CHANNEL_LABELS[i.channel].capitalize()} em {format_date(i.occurred_at)}",
            updated_at=i.occurred_at,
        )
        for i in ctx.interactions
    ]
    sources += [
        SourceRef(type="news", id=n.id, label=n.title, updated_at=n.published_at) for n in ctx.news
    ]
    return sources


def _by_priority(alerts: list[AlertFacts]) -> list[AlertFacts]:
    return sorted(alerts, key=lambda a: PRIORITY_ORDER[a.priority])


def _summary(ctx: BriefingContext, alerts: list[AlertFacts]) -> str:
    client = ctx.client
    parts = [
        f"{client.name}, perfil {RISK_PROFILE_LABELS[client.risk_profile]}, "
        f"carteira de {format_brl(ctx.portfolio_total)}."
    ]
    if ctx.allocation and ctx.portfolio_total > 0:
        main_class, main_value = max(ctx.allocation.items(), key=lambda item: item[1])
        pct = (main_value / ctx.portfolio_total * 100).quantize(Decimal("1"))
        label = ASSET_CLASS_LABELS.get(main_class, main_class)
        parts.append(f"Maior alocação em {label} ({pct}%).")
    if alerts:
        high = sum(1 for a in alerts if a.priority is AlertPriority.HIGH)
        parts.append(f"{len(alerts)} alerta(s) em aberto, {high} de prioridade alta.")
    else:
        parts.append("Sem alertas em aberto.")
    if client.last_contact_at:
        parts.append(f"Último contato em {format_date(client.last_contact_at)}.")
    if ctx.meeting_context:
        parts.append(f"Contexto da reunião: {ctx.meeting_context.rstrip('.')}.")
    return " ".join(parts)


def _topics(ctx: BriefingContext, alerts: list[AlertFacts]) -> list[BriefingTopic]:
    # Um tópico por tipo de alerta, na ordem de prioridade do alerta mais grave
    by_type: dict[AlertType, list[str]] = {}
    for alert in alerts:
        by_type.setdefault(alert.type, []).append(alert.title)
    topics = [
        BriefingTopic(title=ALERT_TOPICS[alert_type][0], reason="; ".join(titles))
        for alert_type, titles in by_type.items()
    ]

    if ctx.goals:
        topics.append(
            BriefingTopic(title="Objetivos", reason="; ".join(map(_goal_line, ctx.goals)))
        )
    if ctx.pending_items:
        reason = "; ".join(item.description for item in ctx.pending_items)
        topics.append(BriefingTopic(title="Pendências", reason=reason))
    if ctx.interactions:
        last = ctx.interactions[0]
        reason = (
            f"{CHANNEL_LABELS[last.channel].capitalize()} em {format_date(last.occurred_at)}: "
            f"{last.summary}"
        )
        topics.append(BriefingTopic(title="Última interação", reason=reason))
    if ctx.news:
        reason = "; ".join(n.explanation or n.title for n in ctx.news)
        topics.append(BriefingTopic(title="Notícias relacionadas", reason=reason))
    return topics


def _goal_line(goal: GoalFacts) -> str:
    line = goal.title
    if goal.target_amount is not None:
        line += f" ({format_brl(goal.target_amount)})"
    if goal.target_date is not None:
        line += f" até {format_date(goal.target_date)}"
    return line


def _questions(alerts: list[AlertFacts]) -> list[str]:
    questions = list(dict.fromkeys(ALERT_TOPICS[a.type][1] for a in alerts))
    questions.append(DEFAULT_QUESTION)
    return questions
