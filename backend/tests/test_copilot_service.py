import unittest
from uuid import uuid4

from app.core.config import Settings
from app.features.copilot.conversation import ConversationStore
from app.features.copilot.llm import LLMProviderError, LLMResult, ToolCall
from app.features.copilot.schemas import ChatRequest, CopilotSourceOut, SuggestedActionOut
from app.features.copilot.service import NO_VERIFIED_DATA, CopilotService
from app.features.copilot.tools import ToolExecution
from app.shared.exceptions import ServiceUnavailableError


class FakeProvider:
    model = "test-model"

    def __init__(self, results: list[LLMResult | Exception]) -> None:
        self.results = results
        self.calls = 0

    async def generate(self, messages, tools, context):
        del messages, tools, context
        result = self.results[self.calls]
        self.calls += 1
        if isinstance(result, Exception):
            raise result
        return result


class FakeRepository:
    def __init__(self) -> None:
        self.logs: list[dict] = []

    async def save_chat_log(self, **values) -> None:
        self.logs.append(values)


class FakeTools:
    def __init__(self, execution: ToolExecution) -> None:
        self.execution = execution

    async def execute(self, call: ToolCall, *, client_id):
        del call, client_id
        return self.execution


class CopilotServiceTests(unittest.IsolatedAsyncioTestCase):
    async def test_response_sources_are_only_created_from_tool_results(self) -> None:
        advisor_id = uuid4()
        alert_id = uuid4()
        provider = FakeProvider(
            [
                LLMResult(tool_calls=[ToolCall("call-1", "list_open_alerts", {})]),
                LLMResult(text="Há um alerta de concentração aberto."),
            ]
        )
        repository = FakeRepository()
        tools = FakeTools(
            ToolExecution(
                content='{"alerts":[{"id":"source-record"}]}',
                sources=[
                    CopilotSourceOut(
                        type="alert", id=alert_id, label="Concentração", updated_at=None
                    )
                ],
                suggested_actions=[
                    SuggestedActionOut(type="open_alert", label="Abrir alerta", target_id=alert_id)
                ],
                records_found=True,
            )
        )
        service = CopilotService(
            repository, provider, Settings(env="test"), tools, ConversationStore()
        )

        response = await service.chat(
            ChatRequest(message="Liste os alertas abertos"), advisor_id=advisor_id
        )

        self.assertEqual(response.sources[0].id, alert_id)
        self.assertEqual(response.suggested_actions[0].target_id, alert_id)
        self.assertEqual(repository.logs[0]["sources"][0]["id"], str(alert_id))
        self.assertEqual(provider.calls, 2)

    async def test_no_verified_records_never_returns_model_claims_or_sources(self) -> None:
        provider = FakeProvider(
            [
                LLMResult(tool_calls=[ToolCall("call-1", "list_open_alerts", {})]),
                LLMResult(text="Há cinco alertas de risco crítico."),
            ]
        )
        repository = FakeRepository()
        tools = FakeTools(ToolExecution(content='{"alerts":[]}', records_found=False))
        service = CopilotService(
            repository, provider, Settings(env="test"), tools, ConversationStore()
        )

        response = await service.chat(ChatRequest(message="Há alertas?"), advisor_id=uuid4())

        self.assertEqual(response.answer, NO_VERIFIED_DATA)
        self.assertEqual(response.sources, [])
        self.assertEqual(response.suggested_actions, [])

    async def test_provider_error_becomes_service_unavailable(self) -> None:
        provider = FakeProvider([LLMProviderError("upstream", provider_request_id="req-123")])
        service = CopilotService(
            FakeRepository(),
            provider,
            Settings(env="test"),
            FakeTools(ToolExecution(content="{}")),
            ConversationStore(),
        )

        with self.assertRaises(ServiceUnavailableError) as raised:
            await service.chat(ChatRequest(message="Resuma clientes"), advisor_id=uuid4())

        self.assertEqual(raised.exception.code, "LLM_PROVIDER_ERROR")
        self.assertEqual(raised.exception.details["provider_request_id"], "req-123")
