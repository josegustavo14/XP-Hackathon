"""Dependências locais da feature copilot."""

from functools import lru_cache
from typing import Annotated

from fastapi import Depends

from app.core.config import Settings, get_settings
from app.features.alerts.dependencies import AlertServiceDep
from app.features.auth.dependencies import AdvisorSession, CurrentUser
from app.features.clients.dependencies import ClientServiceDep
from app.features.copilot.conversation import ConversationStore
from app.features.copilot.llm import LLMProvider
from app.features.copilot.providers.groq import GroqLLMProvider
from app.features.copilot.repository import CopilotRepository
from app.features.copilot.service import CopilotService
from app.features.copilot.tools import CopilotToolExecutor
from app.shared.exceptions import ServiceUnavailableError


def get_llm_provider(settings: Annotated[Settings, Depends(get_settings)]) -> LLMProvider:
    if settings.llm_provider == "groq":
        return GroqLLMProvider(
            api_key=settings.llm_api_key.get_secret_value(),
            model=settings.llm_model,
            base_url=settings.llm_base_url,
            timeout_seconds=settings.llm_timeout_seconds,
            max_output_tokens=settings.llm_max_output_tokens,
        )
    raise ServiceUnavailableError(
        f"Provider de IA não suportado: {settings.llm_provider}.",
        code="LLM_PROVIDER_NOT_SUPPORTED",
    )


LLMProviderDep = Annotated[LLMProvider, Depends(get_llm_provider)]


@lru_cache(maxsize=4)
def get_conversation_store(ttl_seconds: int = 3600) -> ConversationStore:
    return ConversationStore(ttl_seconds=ttl_seconds)


def get_copilot_service(
    session: AdvisorSession,
    current_user: CurrentUser,
    provider: LLMProviderDep,
    clients: ClientServiceDep,
    alerts: AlertServiceDep,
    settings: Annotated[Settings, Depends(get_settings)],
) -> CopilotService:
    return CopilotService(
        CopilotRepository(session),
        provider,
        settings,
        CopilotToolExecutor(clients, alerts),
        get_conversation_store(settings.llm_session_ttl_seconds),
    )


CopilotServiceDep = Annotated[CopilotService, Depends(get_copilot_service)]
