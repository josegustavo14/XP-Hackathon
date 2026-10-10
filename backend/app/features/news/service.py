"""Regras de negócio da feature news.

Recebe tipos de domínio (nunca `Request`) e levanta exceções de
`app.shared.exceptions`; a tradução para HTTP acontece no boundary.
"""

from app.features.news.repository import NewsRepository


class NewsService:
    def __init__(self, repository: NewsRepository) -> None:
        self.repository = repository
