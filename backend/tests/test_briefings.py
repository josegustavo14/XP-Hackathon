"""Briefing pré-atendimento (issue #26): contrato HTTP, service e compositor por regras."""

import asyncio
from datetime import UTC, date, datetime
from decimal import Decimal
from unittest.mock import AsyncMock
from uuid import UUID, uuid4

import pytest
from fastapi.testclient import TestClient

from app.features.auth.dependencies import get_current_user
from app.features.auth.schemas import AuthenticatedUser
from app.features.briefings.composer import collect_sources, compose_briefing, format_brl
from app.features.briefings.context import (
    AlertFacts,
    BriefingContext,
    ClientFacts,
    GoalFacts,
    InteractionFacts,
    NewsFacts,
    PendingItemFacts,
)
from app.features.briefings.dependencies import get_briefings_service
from app.features.briefings.repository import SavedBriefing
from app.features.briefings.schemas import (
    DISCLAIMER,
    BriefingContent,
    BriefingCreate,
    BriefingOut,
    BriefingTopic,
    SourceRef,
)
from app.features.briefings.service import BriefingService
from app.main import create_app
from app.shared.enums import AlertPriority, AlertType, InteractionChannel, RiskProfile
from app.shared.exceptions import NotFoundError

ADVISOR_ID = UUID("cfad0fda-72e6-5474-9ec5-eecb3d065425")
NOW = datetime(2026, 10, 10, 12, 0, tzinfo=UTC)
DEFAULT_QUESTION = "Os objetivos e o horizonte permanecem os mesmos?"


def make_context(**overrides: object) -> BriefingContext:
    client_id = uuid4()
    values: dict[str, object] = {
        "client": ClientFacts(
            id=client_id,
            name="Mariana Costa",
            risk_profile=RiskProfile.MODERATE,
            investment_horizon_yrs=10,
            liquidity_need="baixa",
            suitability_expires_at=None,
            last_contact_at=datetime(2026, 7, 1, tzinfo=UTC),
            updated_at=NOW,
        ),
        "portfolio_total": Decimal("1280000.00"),
        "allocation": {"fixed_income": Decimal("900000.00"), "equities": Decimal("380000.00")},
        "alerts": [],
        "goals": [],
        "interactions": [],
        "pending_items": [],
        "news": [],
        "meeting_context": None,
    }
    values.update(overrides)
    return BriefingContext(**values)  # type: ignore[arg-type]


def make_alert(alert_type: AlertType, priority: AlertPriority, title: str) -> AlertFacts:
    return AlertFacts(id=uuid4(), type=alert_type, priority=priority, title=title, updated_at=NOW)


# ---------------------------------------------------------------------------
# Compositor por regras (sem IA)
# ---------------------------------------------------------------------------


def test_compose_without_alerts_returns_default_question_and_client_source() -> None:
    ctx = make_context()

    content = compose_briefing(ctx)
    sources = collect_sources(ctx)

    assert "Mariana Costa" in content.summary
    assert content.topics == []
    assert content.suggested_questions == [DEFAULT_QUESTION]
    assert [(s.type, s.id) for s in sources] == [("client", ctx.client.id)]


def test_compose_alerts_become_topics_ordered_by_priority() -> None:
    low = make_alert(AlertType.IDLE_CASH, AlertPriority.LOW, "R$ 50 mil parados em conta")
    high = make_alert(
        AlertType.ISSUER_CONCENTRATION, AlertPriority.HIGH, "42% da carteira no Banco X"
    )
    ctx = make_context(alerts=[low, high])

    content = compose_briefing(ctx)
    sources = collect_sources(ctx)

    assert [t.title for t in content.topics] == ["Concentração por emissor", "Caixa parado"]
    assert content.topics[0].reason == "42% da carteira no Banco X"
    alert_sources = [s.id for s in sources if s.type == "alert"]
    assert alert_sources == [high.id, low.id]


def test_compose_groups_alerts_of_same_type_in_one_topic() -> None:
    a = make_alert(AlertType.UPCOMING_MATURITY, AlertPriority.HIGH, "CDB X vence em 5 dias")
    b = make_alert(AlertType.UPCOMING_MATURITY, AlertPriority.MEDIUM, "LCI Y vence em 12 dias")
    ctx = make_context(alerts=[a, b])

    content = compose_briefing(ctx)

    assert len(content.topics) == 1
    assert content.topics[0].title == "Vencimentos próximos"
    assert "CDB X vence em 5 dias" in content.topics[0].reason
    assert "LCI Y vence em 12 dias" in content.topics[0].reason
    # Uma pergunta por tipo de alerta (aqui, um tipo) + a pergunta padrão
    assert len(content.suggested_questions) == 2
    assert content.suggested_questions[-1] == DEFAULT_QUESTION


def test_compose_includes_goals_pending_items_interactions_and_news() -> None:
    goal = GoalFacts(
        id=uuid4(),
        title="Aposentadoria",
        target_amount=Decimal("3000000.00"),
        target_date=date(2045, 1, 1),
    )
    interaction = InteractionFacts(
        id=uuid4(),
        occurred_at=datetime(2026, 7, 1, tzinfo=UTC),
        channel=InteractionChannel.MEETING,
        summary="Cliente quer reduzir risco.",
    )
    pending = PendingItemFacts(
        id=uuid4(), description="Enviar simulação de previdência", due_date=None
    )
    news = NewsFacts(
        id=uuid4(),
        title="Banco X rebaixado",
        published_at=NOW,
        explanation="afeta 30% da carteira via Banco X",
    )
    ctx = make_context(
        goals=[goal], interactions=[interaction], pending_items=[pending], news=[news]
    )

    content = compose_briefing(ctx)
    sources = collect_sources(ctx)

    titles = [t.title for t in content.topics]
    assert "Objetivos" in titles
    assert "Pendências" in titles
    assert "Notícias relacionadas" in titles
    assert DEFAULT_QUESTION in content.suggested_questions
    source_types = {s.type for s in sources}
    assert {"client", "interaction", "news"} <= source_types


def test_compose_mentions_meeting_context_in_summary() -> None:
    ctx = make_context(meeting_context="Revisão trimestral")

    content = compose_briefing(ctx)

    assert "Revisão trimestral" in content.summary


def test_compose_does_not_duplicate_trailing_period_of_meeting_context() -> None:
    ctx = make_context(meeting_context="Revisão trimestral.")

    content = compose_briefing(ctx)

    assert "Revisão trimestral." in content.summary
    assert ".." not in content.summary


def test_compose_formats_money_in_brl_without_float() -> None:
    ctx = make_context(portfolio_total=Decimal("1280000.10"))

    content = compose_briefing(ctx)

    assert "R$ 1.280.000,10" in content.summary


def test_compose_empty_portfolio_shows_zero_without_allocation() -> None:
    ctx = make_context(portfolio_total=Decimal("0"), allocation={})

    content = compose_briefing(ctx)

    assert "R$ 0,00" in content.summary
    assert "Maior alocação" not in content.summary


def test_format_brl_puts_sign_before_currency() -> None:
    assert format_brl(Decimal("-1234.5")) == "-R$ 1.234,50"


def test_compose_shows_dates_in_brasilia_time() -> None:
    # 01:30 UTC de 02/07 = 22:30 de 01/07 em Brasília
    ctx = make_context(
        client=ClientFacts(
            id=uuid4(),
            name="Mariana Costa",
            risk_profile=RiskProfile.MODERATE,
            investment_horizon_yrs=None,
            liquidity_need=None,
            suitability_expires_at=None,
            last_contact_at=datetime(2026, 7, 2, 1, 30, tzinfo=UTC),
            updated_at=NOW,
        )
    )

    content = compose_briefing(ctx)

    assert "Último contato em 01/07/2026" in content.summary


def test_sources_carry_label_and_updated_at() -> None:
    alert = make_alert(AlertType.IDLE_CASH, AlertPriority.LOW, "R$ 50 mil parados em conta")
    ctx = make_context(alerts=[alert])

    sources = collect_sources(ctx)

    assert [(s.type, s.label, s.updated_at) for s in sources] == [
        ("client", "Mariana Costa", NOW),
        ("alert", "R$ 50 mil parados em conta", NOW),
    ]


@pytest.mark.parametrize(
    ("raw", "expected"),
    [(None, None), ("", None), ("   ", None), ("  Revisão trimestral ", "Revisão trimestral")],
)
def test_briefing_create_normalizes_meeting_context(raw: str | None, expected: str | None) -> None:
    assert BriefingCreate(client_id=uuid4(), meeting_context=raw).meeting_context == expected


# ---------------------------------------------------------------------------
# Service
# ---------------------------------------------------------------------------


@pytest.fixture
def repository() -> AsyncMock:
    repo = AsyncMock()
    repo.save_briefing.return_value = SavedBriefing(id=uuid4(), created_at=NOW)
    return repo


def test_service_creates_briefing_with_disclaimer(repository: AsyncMock) -> None:
    ctx = make_context(meeting_context="Revisão trimestral")
    repository.load_context.return_value = ctx
    service = BriefingService(repository)

    result = asyncio.run(
        service.create_briefing(
            BriefingCreate(client_id=ctx.client.id, meeting_context="Revisão trimestral"),
            advisor_id=ADVISOR_ID,
        )
    )

    assert result.client_id == ctx.client.id
    assert result.id == repository.save_briefing.return_value.id
    assert result.generated_at == NOW
    assert result.disclaimer == DISCLAIMER
    repository.load_context.assert_awaited_once_with(
        ctx.client.id, advisor_id=ADVISOR_ID, meeting_context="Revisão trimestral"
    )
    saved_kwargs = repository.save_briefing.await_args.kwargs
    assert saved_kwargs["client_id"] == ctx.client.id
    assert saved_kwargs["advisor_id"] == ADVISOR_ID
    assert isinstance(saved_kwargs["content"], BriefingContent)


def test_service_raises_not_found_for_unknown_client(repository: AsyncMock) -> None:
    repository.load_context.return_value = None
    service = BriefingService(repository)

    with pytest.raises(NotFoundError):
        asyncio.run(
            service.create_briefing(BriefingCreate(client_id=uuid4()), advisor_id=ADVISOR_ID)
        )
    repository.save_briefing.assert_not_awaited()


# ---------------------------------------------------------------------------
# HTTP
# ---------------------------------------------------------------------------


def test_create_briefing_unauthorized(client: TestClient) -> None:
    response = client.post("/api/v1/briefings", json={"client_id": str(uuid4())})
    assert response.status_code == 401


@pytest.fixture
def mock_service() -> AsyncMock:
    return AsyncMock(spec=BriefingService)


@pytest.fixture
def auth_client(mock_service: AsyncMock) -> TestClient:
    app = create_app()
    user = AuthenticatedUser(
        id=ADVISOR_ID,
        email="ana.souza@demo.xpcopilot.dev",
        claims={"sub": str(ADVISOR_ID), "role": "authenticated"},
    )
    app.dependency_overrides[get_current_user] = lambda: user
    app.dependency_overrides[get_briefings_service] = lambda: mock_service
    with TestClient(app) as test_client:
        yield test_client


def make_briefing_out(client_id: UUID) -> BriefingOut:
    return BriefingOut(
        id=uuid4(),
        client_id=client_id,
        summary="Mariana Costa, perfil moderado.",
        topics=[BriefingTopic(title="Concentração por emissor", reason="42% no Banco X")],
        suggested_questions=[DEFAULT_QUESTION],
        sources=[SourceRef(type="client", id=client_id, label="Mariana Costa", updated_at=NOW)],
        generated_at=NOW,
        disclaimer=DISCLAIMER,
    )


def test_create_briefing_returns_201_with_contract(
    auth_client: TestClient, mock_service: AsyncMock
) -> None:
    client_id = uuid4()
    mock_service.create_briefing.return_value = make_briefing_out(client_id)

    response = auth_client.post(
        "/api/v1/briefings",
        json={"client_id": str(client_id), "meeting_context": "Revisão trimestral"},
    )

    assert response.status_code == 201
    body = response.json()
    assert set(body) == {
        "id",
        "client_id",
        "summary",
        "topics",
        "suggested_questions",
        "sources",
        "generated_at",
        "disclaimer",
    }
    assert body["disclaimer"] == "Material de apoio para revisão do assessor."
    assert datetime.fromisoformat(body["generated_at"]) == NOW
    payload = mock_service.create_briefing.await_args.args[0]
    assert payload.meeting_context == "Revisão trimestral"
    assert mock_service.create_briefing.await_args.kwargs["advisor_id"] == ADVISOR_ID


@pytest.mark.parametrize("meeting_context", [None, "x" * 500])
def test_create_briefing_accepts_null_or_max_length_meeting_context(
    auth_client: TestClient, mock_service: AsyncMock, meeting_context: str | None
) -> None:
    client_id = uuid4()
    mock_service.create_briefing.return_value = make_briefing_out(client_id)

    response = auth_client.post(
        "/api/v1/briefings",
        json={"client_id": str(client_id), "meeting_context": meeting_context},
    )

    assert response.status_code == 201
    assert mock_service.create_briefing.await_args.args[0].meeting_context == meeting_context


def test_create_briefing_unknown_client_returns_404(
    auth_client: TestClient, mock_service: AsyncMock
) -> None:
    mock_service.create_briefing.side_effect = NotFoundError(
        "Cliente não encontrado.", code="CLIENT_NOT_FOUND"
    )

    response = auth_client.post("/api/v1/briefings", json={"client_id": str(uuid4())})

    assert response.status_code == 404
    assert response.json()["error"]["code"] == "CLIENT_NOT_FOUND"


@pytest.mark.parametrize(
    "payload",
    [
        {},
        {"client_id": "nao-e-uuid"},
        {"client_id": str(uuid4()), "meeting_context": "x" * 501},
    ],
)
def test_create_briefing_rejects_invalid_payload(
    auth_client: TestClient, mock_service: AsyncMock, payload: dict[str, object]
) -> None:
    response = auth_client.post("/api/v1/briefings", json=payload)

    assert response.status_code == 422
    mock_service.create_briefing.assert_not_awaited()
