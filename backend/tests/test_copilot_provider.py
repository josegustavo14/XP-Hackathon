import asyncio
import json
import unittest

import httpx

from app.features.copilot.llm import ChatMessage, LLMProviderError, ToolDefinition
from app.features.copilot.providers.groq import GroqLLMProvider


def make_provider(transport: httpx.AsyncBaseTransport) -> GroqLLMProvider:
    return GroqLLMProvider(
        api_key="test-key",
        model="llama-3.1-8b-instant",
        base_url="https://api.groq.com/openai/v1",
        timeout_seconds=1,
        max_output_tokens=256,
        transport=transport,
    )


class GroqProviderTests(unittest.TestCase):
    def test_maps_tool_calls_usage_and_request_id(self) -> None:
        def respond(request: httpx.Request) -> httpx.Response:
            self.assertEqual(request.url.path, "/openai/v1/chat/completions")
            body = json.loads(request.content)
            self.assertEqual(body["model"], "llama-3.1-8b-instant")
            self.assertEqual(body["max_tokens"], 256)
            self.assertEqual(body["tools"][0]["function"]["name"], "list_open_alerts")
            return httpx.Response(
                200,
                headers={"x_groq_request_id": "req-test"},
                json={
                    "id": "chatcmpl-test",
                    "choices": [
                        {
                            "message": {
                                "content": None,
                                "tool_calls": [
                                    {
                                        "id": "call-1",
                                        "type": "function",
                                        "function": {
                                            "name": "list_open_alerts",
                                            "arguments": '{"client_id": null}',
                                        },
                                    }
                                ],
                            },
                        }
                    ],
                    "usage": {"prompt_tokens": 12, "completion_tokens": 4, "total_tokens": 16},
                },
            )

        provider = make_provider(httpx.MockTransport(respond))
        result = asyncio.run(
            provider.generate(
                [ChatMessage(role="user", content="Quais alertas estão abertos?")],
                [
                    ToolDefinition(
                        "list_open_alerts", "Lista alertas", {"type": "object", "properties": {}}
                    )
                ],
                {},
            )
        )

        self.assertIsNone(result.text)
        self.assertEqual(result.provider_request_id, "req-test")
        self.assertIsNotNone(result.usage)
        self.assertEqual(result.usage.total_tokens, 16)
        self.assertEqual(result.tool_calls[0].name, "list_open_alerts")
        self.assertEqual(result.tool_calls[0].arguments, {"client_id": None})

    def test_converts_upstream_failure(self) -> None:
        provider = make_provider(
            httpx.MockTransport(
                lambda _: httpx.Response(
                    429,
                    headers={"x_groq_request_id": "req-rate-limit"},
                    json={"error": {"message": "private provider response"}},
                )
            )
        )

        with self.assertRaises(LLMProviderError) as raised:
            asyncio.run(provider.generate([ChatMessage(role="user", content="Oi")], [], {}))

        self.assertTrue(raised.exception.retryable)
        self.assertEqual(raised.exception.provider_request_id, "req-rate-limit")
        self.assertNotIn("private provider response", str(raised.exception))

    def test_requires_api_key(self) -> None:
        provider = GroqLLMProvider(
            api_key="",
            model="llama-3.1-8b-instant",
            base_url="https://api.groq.com/openai/v1",
            timeout_seconds=1,
            max_output_tokens=256,
        )

        with self.assertRaisesRegex(LLMProviderError, "chave da API"):
            asyncio.run(provider.generate([ChatMessage(role="user", content="Oi")], [], {}))
