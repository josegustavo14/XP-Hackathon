import asyncio
from datetime import UTC, datetime

from app.features.news.adapters import RawNewsItem
from app.features.news.collector import NewsCollector

SINCE = datetime(2026, 10, 10, tzinfo=UTC)


class SuccessfulAdapter:
    source_name = "successful-source"

    def __init__(self, items: list[RawNewsItem]) -> None:
        self.items = items
        self.received_since: datetime | None = None

    async def collect(self, since: datetime) -> list[RawNewsItem]:
        self.received_since = since
        return self.items


class FailingAdapter:
    source_name = "failing-source"

    async def collect(self, since: datetime) -> list[RawNewsItem]:
        raise RuntimeError("source unavailable")


def raw_item(external_id: str) -> RawNewsItem:
    return RawNewsItem(
        external_id=external_id,
        title="Market update",
        url=f"https://example.test/news/{external_id}",
        source="example",
        published_at=SINCE,
    )


def test_collects_all_successful_adapters_with_the_same_since() -> None:
    first = SuccessfulAdapter([raw_item("one")])
    second = SuccessfulAdapter([raw_item("two")])

    result = asyncio.run(NewsCollector([first, second]).collect(SINCE))

    assert [item.external_id for item in result.items] == ["one", "two"]
    assert result.failures == []
    assert first.received_since == second.received_since == SINCE


def test_failure_in_one_source_does_not_stop_other_sources() -> None:
    successful = SuccessfulAdapter([raw_item("one")])

    result = asyncio.run(NewsCollector([FailingAdapter(), successful]).collect(SINCE))

    assert [item.external_id for item in result.items] == ["one"]
    assert result.failures[0].source_name == "failing-source"
    assert result.failures[0].error == "source unavailable"


def test_collector_does_not_deduplicate_items() -> None:
    duplicate = raw_item("same-id")

    result = asyncio.run(NewsCollector([SuccessfulAdapter([duplicate, duplicate])]).collect(SINCE))

    assert result.items == [duplicate, duplicate]
