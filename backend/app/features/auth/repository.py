from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.features.auth.models import Advisor


class AdvisorRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def get_by_id(self, advisor_id: UUID) -> Advisor | None:
        return await self.session.get(Advisor, advisor_id)
