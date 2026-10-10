import uuid

from starlette.requests import Request
from starlette.types import ASGIApp, Message, Receive, Scope, Send

TRACE_ID_HEADER = "X-Trace-Id"
_HEADER_KEY = TRACE_ID_HEADER.lower().encode()


def get_trace_id(request: Request) -> str:
    """trace_id da request atual (gerado pelo TraceIdMiddleware)."""
    return getattr(request.state, "trace_id", None) or str(uuid.uuid4())


class TraceIdMiddleware:
    """Gera (ou reaproveita) um trace_id por request e devolve no header `X-Trace-Id`.

    O valor fica em `scope["state"]` (= `request.state.trace_id`) para continuar
    acessível no handler de 500, que o Starlette executa fora deste middleware.
    """

    def __init__(self, app: ASGIApp) -> None:
        self.app = app

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        incoming = dict(scope.get("headers") or []).get(_HEADER_KEY)
        trace_id = incoming.decode() if incoming else str(uuid.uuid4())
        scope.setdefault("state", {})["trace_id"] = trace_id

        async def send_with_trace_id(message: Message) -> None:
            if message["type"] == "http.response.start":
                headers = list(message.get("headers", []))
                if not any(key.lower() == _HEADER_KEY for key, _ in headers):
                    headers.append((_HEADER_KEY, trace_id.encode()))
                message["headers"] = headers
            await send(message)

        await self.app(scope, receive, send_with_trace_id)
