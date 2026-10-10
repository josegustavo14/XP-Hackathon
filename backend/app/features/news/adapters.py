"""Contratos internos para fontes de notícias.

Adapters concretos pertencem às integrações de cada fonte e devem usar APIs ou
RSS quando disponíveis. Nenhuma fonte, URL, seletor ou regra de autenticação é
definida aqui.
"""

from datetime import datetime
from typing import Protocol

from pydantic import BaseModel, ConfigDict, field_validator


class RawNewsItem(BaseModel):
    """Notícia ainda sem normalização ou deduplicação de domínio."""

    model_config = ConfigDict(extra="forbid")

    external_id: str | None = None
    title: str
    url: str
    source: str
    published_at: datetime | None = None
    raw_text: str | None = None

    @field_validator("url")
    @classmethod
    def url_must_use_https(cls, value: str) -> str:
        if not value.startswith("https://"):
            raise ValueError("url must use HTTPS")
        return value


class NewsSourceAdapter(Protocol):
    """Contrato de uma fonte isolada de notícias."""

    source_name: str

    async def collect(self, since: datetime) -> list[RawNewsItem]:
        """Coleta itens brutos publicados desde ``since``."""
        ...
