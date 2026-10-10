"""Dependências locais da feature news."""

from typing import Annotated

from fastapi import Depends

from app.features.news.service import NewsService


def get_news_service() -> NewsService:
    """O sumarizador ainda não depende da persistência de notícias."""

    return NewsService()


NewsServiceDep = Annotated[NewsService, Depends(get_news_service)]
