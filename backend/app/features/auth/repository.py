from uuid import UUID

from sqlalchemy import exists, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.features.auth.models import Advisor, AdvisorClient


class AdvisorRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def get_by_id(self, advisor_id: UUID) -> Advisor | None:
        return await self.session.get(Advisor, advisor_id)

    async def has_client_access(self, advisor_id: UUID, client_id: UUID) -> bool:
        statement = select(
            exists().where(
                AdvisorClient.advisor_id == advisor_id,
                AdvisorClient.client_id == client_id,
            )
        )
        return bool(await self.session.scalar(statement))
