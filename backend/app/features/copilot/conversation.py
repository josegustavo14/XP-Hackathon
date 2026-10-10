"""Histórico efêmero de conversas do MVP, isolado por assessor e cliente."""

from dataclasses import dataclass, field
from threading import RLock
from time import monotonic
from uuid import UUID, uuid4

from app.features.copilot.llm import ChatMessage
from app.shared.exceptions import InvalidRequestError, NotFoundError


@dataclass(slots=True)
class _Conversation:
    advisor_id: UUID
    client_id: UUID | None
    messages: list[ChatMessage] = field(default_factory=list)
    expires_at: float = 0


class ConversationStore:
    def __init__(
        self, *, ttl_seconds: int = 3600, max_sessions: int = 1000, max_messages: int = 20
    ) -> None:
        self.ttl_seconds = ttl_seconds
        self.max_sessions = max_sessions
        self.max_messages = max_messages
        self._conversations: dict[UUID, _Conversation] = {}
        self._lock = RLock()

    def load(
        self,
        *,
        session_id: UUID | None,
        advisor_id: UUID,
        client_id: UUID | None,
    ) -> tuple[UUID, list[ChatMessage]]:
        now = monotonic()
        with self._lock:
            self._prune(now)
            conversation = self._conversations.get(session_id) if session_id else None
            if conversation is None:
                new_id = session_id if session_id is not None else uuid4()
                self._ensure_capacity()
                self._conversations[new_id] = _Conversation(
                    advisor_id=advisor_id,
                    client_id=client_id,
                    expires_at=now + self.ttl_seconds,
                )
                return new_id, []
            if conversation.advisor_id != advisor_id:
                raise NotFoundError(
                    "Sessão de conversa não encontrada.", code="CHAT_SESSION_NOT_FOUND"
                )
            if conversation.client_id != client_id:
                raise InvalidRequestError(
                    "A sessão não pode ser reutilizada para outro cliente.",
                    code="CHAT_SESSION_CLIENT_MISMATCH",
                )
            conversation.expires_at = now + self.ttl_seconds
            return session_id, list(conversation.messages)

    def save_turn(
        self,
        *,
        session_id: UUID,
        advisor_id: UUID,
        client_id: UUID | None,
        prompt: str,
        answer: str,
    ) -> None:
        now = monotonic()
        with self._lock:
            conversation = self._conversations.get(session_id)
            if conversation is None or conversation.advisor_id != advisor_id:
                raise NotFoundError(
                    "Sessão de conversa não encontrada.", code="CHAT_SESSION_NOT_FOUND"
                )
            if conversation.client_id != client_id:
                raise InvalidRequestError(
                    "A sessão não pode ser reutilizada para outro cliente.",
                    code="CHAT_SESSION_CLIENT_MISMATCH",
                )
            conversation.messages.extend(
                [
                    ChatMessage(role="user", content=prompt),
                    ChatMessage(role="assistant", content=answer),
                ]
            )
            conversation.messages = conversation.messages[-self.max_messages :]
            conversation.expires_at = now + self.ttl_seconds

    def _prune(self, now: float) -> None:
        expired = [key for key, value in self._conversations.items() if value.expires_at <= now]
        for key in expired:
            self._conversations.pop(key, None)

    def _ensure_capacity(self) -> None:
        if len(self._conversations) < self.max_sessions:
            return
        oldest = min(self._conversations, key=lambda key: self._conversations[key].expires_at)
        self._conversations.pop(oldest, None)
