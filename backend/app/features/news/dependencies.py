"""Dependências locais da feature news."""

from typing import Annotated

from fastapi import Depends

from app.features.auth.dependencies import AdvisorSession
from app.features.news.repository import NewsRepository
from app.features.news.service import NewsService


def get_news_service(session: AdvisorSession) -> NewsService:
    return NewsService.with_repository(NewsRepository(session))


NewsServiceDep = Annotated[NewsService, Depends(get_news_service)]
