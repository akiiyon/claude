"""Market data orchestration: live quote loop, caching, and on-demand subscriptions."""

import asyncio
import contextlib
import logging
import re
from collections import Counter
from datetime import UTC, datetime

from app.core.config import Settings
from app.core.errors import InvalidRequestError, SymbolNotFoundError
from app.data.universe import TOP_10, get_listing
from app.schemas.stock import Candle, History, HistoryRange, Quote
from app.services.broadcaster import Broadcaster
from app.services.cache import TTLCache
from app.services.providers.base import RANGE_INTERVALS, MarketDataProvider

logger = logging.getLogger(__name__)

_SYMBOL_RE = re.compile(r"^[A-Z][A-Z0-9.\-]{0,9}$")


def normalize_symbol(raw: str) -> str:
    symbol = raw.strip().upper()
    if not _SYMBOL_RE.match(symbol):
        raise InvalidRequestError(f"'{raw}' is not a valid ticker symbol")
    if get_listing(symbol) is None:
        raise SymbolNotFoundError(f"'{symbol}' is not in the supported catalog")
    return symbol


class MarketService:
    def __init__(self, provider: MarketDataProvider, settings: Settings) -> None:
        self.provider = provider
        self.settings = settings
        self.broadcaster = Broadcaster()
        self._quotes: dict[str, Quote] = {}
        self._extra_subscriptions: Counter[str] = Counter()
        self._candles: TTLCache[list[Candle]] = TTLCache()
        self._task: asyncio.Task[None] | None = None
        self.last_refresh: datetime | None = None

    # ---- lifecycle -------------------------------------------------------

    async def start(self) -> None:
        await self.refresh_quotes()
        self._task = asyncio.create_task(self._run(), name="quote-refresh")

    async def stop(self) -> None:
        if self._task:
            self._task.cancel()
            with contextlib.suppress(asyncio.CancelledError):
                await self._task
        await self.provider.aclose()

    async def _run(self) -> None:
        while True:
            await asyncio.sleep(self.settings.quote_interval_seconds)
            try:
                await self.refresh_quotes()
            except Exception:  # keep the stream alive across transient provider failures
                logger.exception("Quote refresh failed")

    # ---- quotes ----------------------------------------------------------

    @property
    def tracked_symbols(self) -> list[str]:
        active = self._extra_subscriptions.items()
        extras = sorted(s for s, n in active if n > 0 and s not in TOP_10)
        return [*TOP_10, *extras]

    async def refresh_quotes(self) -> list[Quote]:
        fresh = await self.provider.get_quotes(self.tracked_symbols)
        self._quotes.update(fresh)
        self.last_refresh = datetime.now(UTC)
        if fresh:
            self.broadcaster.publish(
                {"type": "quotes", "data": [q.model_dump(mode="json") for q in fresh.values()]}
            )
        return list(fresh.values())

    def cached_quotes(self, symbols: list[str]) -> list[Quote]:
        return [self._quotes[s] for s in symbols if s in self._quotes]

    async def top_quotes(self) -> list[Quote]:
        missing = [s for s in TOP_10 if s not in self._quotes]
        if missing:
            self._quotes.update(await self.provider.get_quotes(missing))
        return self.cached_quotes(list(TOP_10))

    async def get_quote(self, symbol: str) -> Quote:
        cached = self._quotes.get(symbol)
        if cached and symbol in self.tracked_symbols:
            return cached
        fetched = await self.provider.get_quotes([symbol])
        if symbol not in fetched:
            raise SymbolNotFoundError(f"No quote available for '{symbol}'")
        self._quotes[symbol] = fetched[symbol]
        return fetched[symbol]

    async def get_quotes(self, symbols: list[str]) -> list[Quote]:
        return list(await asyncio.gather(*(self.get_quote(s) for s in symbols)))

    def subscribe(self, symbols: list[str]) -> None:
        self._extra_subscriptions.update(symbols)

    def unsubscribe(self, symbols: list[str]) -> None:
        self._extra_subscriptions.subtract(symbols)
        self._extra_subscriptions += Counter()  # drop non-positive counts

    # ---- history ---------------------------------------------------------

    async def get_candles(self, symbol: str, range_: str, interval: str) -> list[Candle]:
        key = f"{symbol}:{range_}:{interval}"
        cached = self._candles.get(key)
        if cached is not None:
            return cached
        candles = await self.provider.get_candles(symbol, range_, interval)
        intraday = interval.endswith("m")
        ttl = 30 if intraday or not self.provider.is_live else self.settings.history_cache_seconds
        self._candles.set(key, candles, ttl)
        return candles

    async def get_history(self, symbol: str, range_: HistoryRange) -> History:
        interval = RANGE_INTERVALS[range_]
        candles = await self.get_candles(symbol, range_, interval)
        return History(symbol=symbol, range=range_, interval=interval, candles=candles)
