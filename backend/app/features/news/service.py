"""Normalização, sumarização e relevância explicável de notícias."""

import unicodedata
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from decimal import Decimal
from hashlib import md5, sha256
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit
from uuid import UUID
from zoneinfo import ZoneInfo

from app.features.news.repository import NewsFeedRecord, NewsRepository
from app.features.news.schemas import (
    ActiveAlertContext,
    ClientPortfolioContext,
    CollectedNewsArticle,
    NewsArticle,
    NewsHighlight,
    NewsListItem,
    NewsListResponse,
    NewsRelevance,
    NewsRelevanceArticle,
    NewsRelevanceOut,
    NewsSummary,
    NewsSummaryPeriod,
)
from app.shared.enums import NewsMatchType
from app.shared.schemas import PageMeta

_TRACKING_PARAMETERS = {"fbclid", "gclid", "mc_cid", "mc_eid"}
_OPERATIONAL_TIMEZONE = ZoneInfo("America/Sao_Paulo")


@dataclass(frozen=True)
class NormalizedNewsArticle:
    external_id: str | None
    title: str
    summary: str | None
    source: str
    url: str
    published_at: datetime | None
    collected_at: datetime
    topics: list[str]
    title_hash: str
    content_hash: str


@dataclass(frozen=True)
class NewsIngestionResult:
    article_id: object
    created: bool
    deduplicated_by: str | None


@dataclass(frozen=True)
class _RelevanceEvidence:
    match_type: NewsMatchType
    score: float
    exposure_value: Decimal
    matched: list[dict[str, object]]
    matched_topics: list[str]
    reason: str


def _compact_text(value: str) -> str:
    return " ".join(unicodedata.normalize("NFKC", value).split())


def _hash(value: str) -> str:
    return sha256(value.encode("utf-8")).hexdigest()


def _title_hash(source: str, title: str) -> str:
    """Hash não criptográfico usado apenas como chave de deduplicação."""
    return md5(f"{source}\n{title.casefold()}".encode(), usedforsecurity=False).hexdigest()


def _canonical_url(value: str) -> str:
    parsed = urlsplit(value.strip())
    if parsed.scheme.lower() not in {"http", "https"} or not parsed.netloc:
        raise ValueError("A URL da notícia deve usar HTTP ou HTTPS.")

    query = [
        (key, item)
        for key, item in parse_qsl(parsed.query, keep_blank_values=True)
        if not key.casefold().startswith("utm_") and key.casefold() not in _TRACKING_PARAMETERS
    ]
    path = parsed.path.rstrip("/") or "/"
    return urlunsplit(
        (parsed.scheme.lower(), parsed.netloc.lower(), path, urlencode(sorted(query)), "")
    )


def normalize_news_article(
    article: CollectedNewsArticle, *, collected_at: datetime | None = None
) -> NormalizedNewsArticle:
    """Normaliza sem guardar ``content``; ele existe apenas para calcular o hash."""
    source = _compact_text(article.source).casefold()
    title = _compact_text(article.title)
    if not source or not title:
        raise ValueError("Fonte e título são obrigatórios.")

    external_id = _compact_text(article.external_id) if article.external_id else None
    summary = _compact_text(article.summary) if article.summary else None
    title_hash = _title_hash(source, title)
    normalized_content = _compact_text(article.content) if article.content else None
    content_hash = _hash(normalized_content) if normalized_content else title_hash
    topics = list(
        dict.fromkeys(
            _compact_text(topic).casefold() for topic in article.topics if topic.strip()
        )
    )
    timestamp = collected_at or datetime.now(UTC)
    if timestamp.tzinfo is None:
        timestamp = timestamp.replace(tzinfo=UTC)

    return NormalizedNewsArticle(
        external_id=external_id,
        title=title,
        summary=summary,
        source=source,
        url=_canonical_url(article.url),
        published_at=article.published_at,
        collected_at=timestamp,
        topics=topics,
        title_hash=title_hash,
        content_hash=content_hash,
    )


class NewsService:
    def __init__(self) -> None:
        self.repository: NewsRepository | None = None

    @classmethod
    def with_repository(cls, repository: NewsRepository) -> "NewsService":
        service = cls()
        service.repository = repository
        return service

    async def ingest(self, collected: CollectedNewsArticle) -> NewsIngestionResult:
        """Cria um artigo ou registra a recoleta seguindo a ordem contratada."""
        repository = self._repository()
        article = normalize_news_article(collected)

        existing = await repository.find_by_url(article.url)
        deduplicated_by = "canonical_url" if existing else None
        if existing is None and article.external_id is not None:
            existing = await repository.find_by_external_id(
                source=article.source, external_id=article.external_id
            )
            deduplicated_by = "external_id" if existing else None
        if existing is None:
            existing = await repository.find_by_title_hash(
                source=article.source, title_hash=article.title_hash
            )
            deduplicated_by = "title_source_hash" if existing else None
        if existing is None:
            existing = await repository.find_by_content_hash(article.content_hash)
            deduplicated_by = "content_hash" if existing else None

        if existing is not None:
            await repository.mark_recollected(
                existing.id,
                collected_at=article.collected_at,
                summary=article.summary,
                content_hash=article.content_hash,
            )
            return NewsIngestionResult(
                article_id=existing.id, created=False, deduplicated_by=deduplicated_by
            )

        created = await repository.create(**article.__dict__)
        return NewsIngestionResult(article_id=created.id, created=True, deduplicated_by=None)

    async def summarize(
        self,
        *,
        period: NewsSummaryPeriod,
        articles: list[NewsArticle],
        generated_at: datetime | None = None,
    ) -> NewsSummary:
        """Resumo extrativo: não acrescenta fatos, interpretações ou recomendações."""
        highlights = [
            NewsHighlight(
                title=article.title,
                summary=article.summary or article.title,
                article_ids=[article.id],
            )
            for article in articles
        ]
        return NewsSummary(
            period=period,
            summary=(
                "Destaques extraídos exclusivamente das fontes fornecidas."
                if articles
                else "Nenhuma notícia foi fornecida para este período."
            ),
            highlights=highlights,
            generated_at=generated_at or datetime.now(UTC),
        )

    async def list_feed(
        self,
        *,
        period: NewsSummaryPeriod,
        client_id: UUID | None,
        topic: str | None,
        page: int,
        page_size: int,
        now: datetime | None = None,
    ) -> NewsListResponse:
        """Consulta o feed; ``day`` e ``week`` são janelas, não atributos do artigo."""
        start_at = self._period_start(period, now=now)
        records, total = await self._repository().list_feed(
            start_at=start_at,
            client_id=client_id,
            topic=topic.casefold() if topic else None,
            offset=(page - 1) * page_size,
            limit=page_size,
        )
        items = [self._feed_item(record) for record in records]
        updated_at = max(
            (record.article.collected_at for record in records),
            default=now or datetime.now(UTC),
        )
        return NewsListResponse(
            items=items,
            meta=PageMeta.build(page=page, page_size=page_size, total=total),
            updated_at=updated_at,
        )

    async def get_summary(
        self, *, period: NewsSummaryPeriod, now: datetime | None = None
    ) -> NewsSummary:
        """Gera o resumo a partir dos artigos da janela operacional consultada."""
        articles = await self._repository().list_for_summary(
            start_at=self._period_start(period, now=now)
        )
        return await self.summarize(
            period=period,
            articles=[
                NewsArticle(
                    id=article.id,
                    title=article.title,
                    summary=article.summary,
                    url=article.url,
                    source_name=article.source,
                    published_at=article.published_at,
                )
                for article in articles
            ],
            generated_at=now,
        )

    async def assess_relevance(
        self,
        *,
        article: NewsRelevanceArticle,
        portfolio: ClientPortfolioContext,
        active_alerts: list[ActiveAlertContext] | None = None,
        persist: bool = False,
    ) -> NewsRelevance | None:
        """Avalia potencial relevância com regras rastreáveis.

        A taxonomia oficial e embeddings continuam em aberto. Por isso temas só
        casam por igualdade explícita com classes de ativo ou com temas já
        classificados em alertas ativos; o método nunca tenta deduzi-los do
        texto de uma notícia ou alerta.
        """
        evidence = self._relevance_evidence(article, portfolio, active_alerts or [])
        if evidence is None:
            return None

        result = NewsRelevance(
            news_id=article.id,
            client_id=portfolio.client_id,
            relevance_score=evidence.score,
            reason=evidence.reason,
            matched_topics=evidence.matched_topics,
        )
        if persist:
            await self._repository().upsert_client_impact(
                news_id=article.id,
                client_id=portfolio.client_id,
                match_type=evidence.match_type,
                exposure_value=evidence.exposure_value,
                exposure_pct=(evidence.exposure_value / Decimal(str(portfolio.total_value))),
                matched=evidence.matched,
                relevance=round(evidence.score * 100),
                explanation=evidence.reason,
            )
        return result

    def _repository(self) -> NewsRepository:
        if self.repository is None:
            raise RuntimeError("Esta operação requer um repositório de notícias.")
        return self.repository

    @staticmethod
    def _period_start(period: NewsSummaryPeriod, *, now: datetime | None = None) -> datetime:
        """Usa America/Sao_Paulo até que a XP defina outro corte operacional."""
        current = (now or datetime.now(UTC)).astimezone(_OPERATIONAL_TIMEZONE)
        day_start = current.replace(hour=0, minute=0, second=0, microsecond=0)
        if period is NewsSummaryPeriod.DAY:
            return day_start
        return day_start - timedelta(days=day_start.weekday())

    @staticmethod
    def _feed_item(record: NewsFeedRecord) -> NewsListItem:
        article = record.article
        relevance = None
        if record.impact is not None:
            relevance = NewsRelevanceOut(
                client_id=record.impact.client_id,
                score=(record.impact.relevance or 0) / 100,
                reason=record.impact.explanation or "Relevância calculada para a carteira.",
            )
        return NewsListItem(
            id=article.id,
            title=article.title,
            summary=article.summary or article.title,
            source=article.source,
            url=article.url,
            published_at=article.published_at,
            topics=article.topics or [],
            relevance=relevance,
        )

    @staticmethod
    def _relevance_evidence(
        article: NewsRelevanceArticle,
        portfolio: ClientPortfolioContext,
        active_alerts: list[ActiveAlertContext],
    ) -> _RelevanceEvidence | None:
        topics = {_compact_text(topic).casefold() for topic in article.topics if topic.strip()}
        tickers = {_compact_text(item).upper() for item in article.tickers if item.strip()}
        issuer_ids = set(article.issuer_ids)
        asset_classes = {
            _compact_text(item).casefold() for item in article.asset_classes if item.strip()
        }
        alert_topics = {
            _compact_text(topic).casefold()
            for alert in active_alerts
            for topic in alert.topics
            if topic.strip()
        }

        direct_matches: list[dict[str, object]] = []
        matched_value = Decimal("0")
        strongest: tuple[NewsMatchType, float, str] | None = None
        for holding in portfolio.holdings:
            code = _compact_text(holding.asset_code).upper()
            asset_class = _compact_text(holding.asset_class).casefold()
            match: tuple[NewsMatchType, float, str] | None = None
            if code in tickers:
                match = (NewsMatchType.HOLDS_ASSET, 0.82, f"ativo {holding.asset_code} citado")
            elif holding.issuer_id is not None and holding.issuer_id in issuer_ids:
                match = (NewsMatchType.ISSUER_EXPOSURE, 0.72, "emissor citado")
            elif asset_class in asset_classes:
                match = (NewsMatchType.ASSET_CLASS, 0.62, f"classe {holding.asset_class} citada")
            elif asset_class in topics:
                match = (NewsMatchType.MACRO, 0.50, f"tema {asset_class} relacionado à classe")
            if match is None:
                continue
            direct_matches.append(
                {
                    "asset": holding.asset_code,
                    "match": match[0].value,
                    "value": holding.market_value,
                }
            )
            matched_value += Decimal(str(holding.market_value))
            if strongest is None or match[1] > strongest[1]:
                strongest = match

        matched_topics = sorted((topics & asset_classes) | (topics & alert_topics))
        if strongest is not None:
            match_type, score, relation = strongest
            return _RelevanceEvidence(
                match_type=match_type,
                score=score,
                exposure_value=matched_value,
                matched=direct_matches,
                matched_topics=matched_topics,
                reason=(
                    "Notícia potencialmente relevante: a carteira possui exposição "
                    f"via {relation}."
                ),
            )
        if matched_topics:
            return _RelevanceEvidence(
                match_type=NewsMatchType.MACRO,
                score=0.55,
                exposure_value=Decimal("0"),
                matched=[],
                matched_topics=matched_topics,
                reason=(
                    "Notícia potencialmente relevante: há alerta ativo associado aos temas "
                    f"{', '.join(matched_topics)}."
                ),
            )
        return None
