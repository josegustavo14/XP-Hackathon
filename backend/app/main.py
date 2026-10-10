"""Entrypoint da aplicação FastAPI modular por features (issue #42)."""

from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import API_V1_PREFIX, Settings, get_settings
from app.core.database import dispose_engine
from app.core.errors import register_exception_handlers
from app.core.middleware import TRACE_ID_HEADER, TraceIdMiddleware
from app.features.alerts import router as alerts
from app.features.auth import router as auth
from app.features.briefings import router as briefings
from app.features.clients import router as clients
from app.features.copilot import router as copilot
from app.features.demo import router as demo
from app.features.health import router as health
from app.features.interactions import router as interactions
from app.features.news import router as news
from app.features.portfolios import router as portfolios


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    yield
    await dispose_engine()


def create_app(settings: Settings | None = None) -> FastAPI:
    settings = settings or get_settings()

    app = FastAPI(
        title=settings.app_name,
        version=settings.app_version,
        docs_url="/docs",
        redoc_url="/redoc",
        openapi_url="/openapi.json",
        lifespan=lifespan,
    )

    # 1. Middleware de rastreabilidade (X-Trace-Id)
    app.add_middleware(TraceIdMiddleware)

    # 2. CORS configurável
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins_list,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
        expose_headers=[TRACE_ID_HEADER],
        allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1)(:\d+)?$",
    )

    # 3. Handler global de exceções padronizado no envelope de erro
    register_exception_handlers(app)

    # 4. Rotas de Health Check (raiz e prefixada)
    app.include_router(health.router)
    app.include_router(health.router, prefix=API_V1_PREFIX)

    # 5. Registro modular das features sob /api/v1
    # O modo mock é somente local: mantém o frontend demonstrável sem banco
    # ou serviços externos e não é montado em ambientes integrados.
    if settings.auth_mode == "mock":
        app.include_router(demo.router, prefix=API_V1_PREFIX)
    app.include_router(auth.router, prefix=f"{API_V1_PREFIX}/auth", tags=["auth"])
    app.include_router(clients.router, prefix=f"{API_V1_PREFIX}/clients", tags=["clients"])
    app.include_router(
        clients.dashboard_router, prefix=f"{API_V1_PREFIX}/dashboard", tags=["dashboard"]
    )
    app.include_router(portfolios.router, prefix=f"{API_V1_PREFIX}/portfolios", tags=["portfolios"])
    app.include_router(alerts.router, prefix=f"{API_V1_PREFIX}/alerts", tags=["alerts"])
    app.include_router(
        interactions.router, prefix=f"{API_V1_PREFIX}/interactions", tags=["interactions"]
    )
    app.include_router(briefings.router, prefix=f"{API_V1_PREFIX}/briefings", tags=["briefings"])
    app.include_router(copilot.router, prefix=f"{API_V1_PREFIX}/copilot", tags=["copilot"])
    app.include_router(news.router, prefix=f"{API_V1_PREFIX}/news", tags=["news"])

    return app


app = create_app()
