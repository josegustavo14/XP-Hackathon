"""Feature news: Notícias, adapters de coleta e impacto nos clientes."""

from app.features.news.adapters import NewsSourceAdapter, RawNewsItem
from app.features.news.collector import NewsCollector

__all__ = ["NewsCollector", "NewsSourceAdapter", "RawNewsItem"]
