"""Tipos internos do boundary de LLM; independentes de qualquer provider."""

from collections.abc import Mapping
from dataclasses import dataclass, field
from typing import Any, Literal, Protocol


@dataclass(frozen=True, slots=True)
class ToolCall:
    id: str
    name: str
    arguments: dict[str, Any]


@dataclass(frozen=True, slots=True)
class ChatMessage:
    role: Literal["system", "user", "assistant", "tool"]
    content: str | None
    tool_call_id: str | None = None
    tool_calls: list[ToolCall] = field(default_factory=list)


@dataclass(frozen=True, slots=True)
class ToolDefinition:
    name: str
    description: str
    parameters: Mapping[str, Any]


@dataclass(frozen=True, slots=True)
class LLMUsage:
    prompt_tokens: int = 0
    completion_tokens: int = 0
    total_tokens: int = 0


@dataclass(frozen=True, slots=True)
class LLMResult:
    text: str | None = None
    tool_calls: list[ToolCall] = field(default_factory=list)
    usage: LLMUsage | None = None
    provider_request_id: str | None = None


class LLMProviderError(Exception):
    def __init__(
        self,
        message: str,
        *,
        retryable: bool = False,
        provider_request_id: str | None = None,
    ) -> None:
        self.retryable = retryable
        self.provider_request_id = provider_request_id
        super().__init__(message)


class LLMProvider(Protocol):
    async def generate(
        self,
        messages: list[ChatMessage],
        tools: list[ToolDefinition],
        context: dict[str, Any],
    ) -> LLMResult: ...