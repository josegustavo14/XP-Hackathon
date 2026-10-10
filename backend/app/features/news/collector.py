"""Orquestra a coleta de adapters sem acoplar o domínio a uma fonte externa."""

import asyncio
import logging
from collections.abc import Iterable
from dataclasses import dataclass
from datetime import datetime

from app.features.news.adapters import NewsSourceAdapter, RawNewsItem

logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class NewsCollectionFailure:
    """Falha de uma fonte que não impede a coleta das demais."""

    source_name: str
    error: str


@dataclass(frozen=True)
class NewsCollectionResult:
    """Resultado bruto da coleta; deduplicação pertence a outra camada."""

    items: list[RawNewsItem]
    failures: list[NewsCollectionFailure]


class NewsCollector:
    """Executa adapters independentemente e preserva todos os itens recebidos."""

    def __init__(self, adapters: Iterable[NewsSourceAdapter]) -> None:
        self._adapters = tuple(adapters)

    async def collect(self, since: datetime) -> NewsCollectionResult:
        """Coleta de todas as fontes, mantendo falhas isoladas por adapter."""
        outcomes = await asyncio.gather(
            *(adapter.collect(since) for adapter in self._adapters), return_exceptions=True
        )

        items: list[RawNewsItem] = []
        failures: list[NewsCollectionFailure] = []
        for adapter, outcome in zip(self._adapters, outcomes, strict=True):
            if isinstance(outcome, Exception):
                logger.warning(
                    "News collection failed for source %s: %s", adapter.source_name, outcome
                )
                failures.append(
                    NewsCollectionFailure(source_name=adapter.source_name, error=str(outcome))
                )
                continue
            # Não deduplicar aqui: cada item permanece responsabilidade da fonte e
            # a regra de deduplicação pertence à camada de normalização/persistência.
            items.extend(outcome)

        return NewsCollectionResult(items=items, failures=failures)
