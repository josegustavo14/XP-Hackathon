"""Adapter Groq via protocolo OpenAI-compatible, sem SDK específico do provider."""

import json
from collections.abc import Mapping
from typing import Any

import httpx

from app.features.copilot.llm import (
    ChatMessage,
    LLMProviderError,
    LLMResult,
    LLMUsage,
    ToolCall,
    ToolDefinition,
)


class GroqLLMProvider:
    def __init__(
        self,
        *,
        api_key: str,
        model: str,
        base_url: str,
        timeout_seconds: float,
        max_output_tokens: int,
        transport: httpx.AsyncBaseTransport | None = None,
    ) -> None:
        self.api_key = api_key
        self.model = model
        self.base_url = f"{base_url.rstrip('/')}/"
        self.timeout_seconds = timeout_seconds
        self.max_output_tokens = max_output_tokens
        self.transport = transport

    async def generate(
        self,
        messages: list[ChatMessage],
        tools: list[ToolDefinition],
        context: dict[str, Any],
    ) -> LLMResult:
        del context
        if not self.api_key:
            raise LLMProviderError("A chave da API do provider de IA não está configurada.")

        body: dict[str, Any] = {
            "model": self.model,
            "messages": [self._serialize_message(message) for message in messages],
            "max_tokens": self.max_output_tokens,
            "temperature": 0.1,
        }
        if tools:
            body["tools"] = [
                {
                    "type": "function",
                    "function": {
                        "name": tool.name,
                        "description": tool.description,
                        "parameters": dict(tool.parameters),
                    },
                }
                for tool in tools
            ]
            body["tool_choice"] = "auto"

        headers = {"Authorization": f"Bearer {self.api_key}"}
        try:
            async with httpx.AsyncClient(
                base_url=self.base_url,
                headers=headers,
                timeout=self.timeout_seconds,
                transport=self.transport,
            ) as client:
                response = await client.post("chat/completions", json=body)
            request_id = response.headers.get("x_groq_request_id") or response.headers.get(
                "x-request-id"
            )
            response.raise_for_status()
            payload = response.json()
        except httpx.TimeoutException as exc:
            raise LLMProviderError(
                "O provider de IA excedeu o tempo limite.", retryable=True
            ) from exc
        except httpx.HTTPStatusError as exc:
            status = exc.response.status_code
            request_id = exc.response.headers.get("x_groq_request_id") or exc.response.headers.get(
                "x-request-id"
            )
            raise LLMProviderError(
                "O provider de IA recusou ou não conseguiu processar a solicitação.",
                retryable=status == 429 or status >= 500,
                provider_request_id=request_id,
            ) from exc
        except (httpx.RequestError, ValueError) as exc:
            raise LLMProviderError(
                "Não foi possível comunicar com o provider de IA.", retryable=True
            ) from exc

        return self._parse_response(payload, request_id)

    @staticmethod
    def _serialize_message(message: ChatMessage) -> dict[str, Any]:
        serialized: dict[str, Any] = {"role": message.role, "content": message.content}
        if message.tool_call_id:
            serialized["tool_call_id"] = message.tool_call_id
        if message.tool_calls:
            serialized["tool_calls"] = [
                {
                    "id": call.id,
                    "type": "function",
                    "function": {
                        "name": call.name,
                        "arguments": json.dumps(call.arguments),
                    },
                }
                for call in message.tool_calls
            ]
        return serialized

    def _parse_response(self, payload: Mapping[str, Any], request_id: str | None) -> LLMResult:
        try:
            response_id = payload.get("id")
            request_id = request_id or (str(response_id) if response_id else None)
            choice = payload["choices"][0]
            message = choice["message"]
            raw_tool_calls = message.get("tool_calls") or []
            calls = [self._parse_tool_call(raw_call) for raw_call in raw_tool_calls]
            raw_usage = payload.get("usage") or {}
            usage = LLMUsage(
                prompt_tokens=int(raw_usage.get("prompt_tokens", 0)),
                completion_tokens=int(raw_usage.get("completion_tokens", 0)),
                total_tokens=int(raw_usage.get("total_tokens", 0)),
            )
            text = message.get("content")
            if text is not None and not isinstance(text, str):
                raise TypeError("assistant content is not text")
        except (KeyError, IndexError, TypeError, ValueError, AttributeError) as exc:
            raise LLMProviderError(
                "O provider de IA retornou uma resposta inválida.",
                provider_request_id=request_id,
            ) from exc

        return LLMResult(
            text=text,
            tool_calls=calls,
            usage=usage,
            provider_request_id=request_id,
        )

    @staticmethod
    def _parse_tool_call(payload: Mapping[str, Any]) -> ToolCall:
        function = payload["function"]
        arguments = function.get("arguments", "{}")
        if isinstance(arguments, str):
            arguments = json.loads(arguments)
        if not isinstance(arguments, dict):
            raise TypeError("tool arguments must be an object")
        return ToolCall(id=str(payload["id"]), name=str(function["name"]), arguments=arguments)
