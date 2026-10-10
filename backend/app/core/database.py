"""Engine e sessões assíncronas do SQLAlchemy apontando para o Postgres do Supabase."""

import json
from collections.abc import AsyncIterator
from functools import lru_cache
from typing import Any

from sqlalchemy import text
from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

from app.core.config import get_settings


@lru_cache
def get_engine() -> AsyncEngine:
    """Engine criado sob demanda: a app sobe (e os testes rodam) sem banco disponível."""
    settings = get_settings()
    return create_async_engine(
        settings.database_url,
        echo=settings.database_echo,
        pool_pre_ping=True,
        # Pooler do Supabase (pgbouncer em modo transaction) não suporta prepared statements
        connect_args={"statement_cache_size": 0},
    )


@lru_cache
def get_sessionmaker() -> async_sessionmaker[AsyncSession]:
    return async_sessionmaker(get_engine(), expire_on_commit=False)


async def get_db_session() -> AsyncIterator[AsyncSession]:
    """Sessão SEM RLS (papel do servidor). Uso restrito a rotinas de sistema,
    ex.: `refresh_alerts()`. Endpoints de assessor devem usar a sessão com RLS."""
    async with get_sessionmaker()() as session, session.begin():
        yield session


async def open_rls_session(claims: dict[str, Any]) -> AsyncIterator[AsyncSession]:
    """Sessão que se comporta como o usuário autenticado no Supabase.

    Dentro da transação define o papel `authenticated` e as claims do JWT, de
    modo que `auth.uid()` e as policies de RLS do schema.sql se apliquem.
    """
    async with get_sessionmaker()() as session, session.begin():
        await session.execute(text("set local role authenticated"))
        await session.execute(
            text("select set_config('request.jwt.claims', :claims, true)"),
            {"claims": json.dumps(claims)},
        )
        yield session


async def dispose_engine() -> None:
    if get_engine.cache_info().currsize:
        await get_engine().dispose()
        get_engine.cache_clear()
        get_sessionmaker.cache_clear()
