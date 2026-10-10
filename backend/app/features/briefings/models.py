"""Briefings não têm tabela própria: são registros de `ai_logs` com kind = 'briefing'."""

from app.features.copilot.models import AiLog

__all__ = ["AiLog"]
