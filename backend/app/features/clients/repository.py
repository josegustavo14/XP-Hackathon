"""Persistência da feature clients. Retorna models/tipos de domínio, nunca Response HTTP."""

from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.features.clients.models import Client


class ClientRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def search_for_copilot(
        self,
        *,
        query: str | None,
        client_id: UUID | None,
        limit: int,
    ) -> list[Client]:
        statement = select(Client).order_by(Client.full_name).limit(limit)
        if client_id is not None:
            statement = statement.where(Client.id == client_id)
        if query:
            escaped_query = query.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")
            statement = statement.where(Client.full_name.ilike(f"%{escaped_query}%", escape="\\"))
        result = await self.session.scalars(statement)
        return list(result.all())
