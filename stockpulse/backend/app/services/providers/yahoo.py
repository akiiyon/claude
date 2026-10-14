"""Yahoo Finance chart API provider (no API key required)."""

import asyncio
import logging
from datetime import UTC, datetime
from typing import Any

import httpx

from app.core.errors import ProviderUnavailableError, SymbolNotFoundError
from app.data.universe import get_listing
from app.schemas.stock import Candle, Quote
from app.services.providers.base import MarketDataProvider

logger = logging.getLogger(__name__)

_BASE_URL = "https://query1.finance.yahoo.com/v8/finance/chart/"
_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/537.36 "
        "(KHTML, like Gecko) Chrome/126.0 Safari/537.36"
    ),
    "Accept": "application/json",
}


_OHLC = ("open", "high", "low", "close")


class YahooFinanceProvider(MarketDataProvider):
    name = "yahoo"
    is_live = True

    def __init__(self, timeout: float = 8.0, max_concurrency: int = 6) -> None:
        self._client = httpx.AsyncClient(base_url=_BASE_URL, headers=_HEADERS, timeout=timeout)
        self._semaphore = asyncio.Semaphore(max_concurrency)

    async def aclose(self) -> None:
        await self._client.aclose()

    async def _chart(self, symbol: str, params: dict[str, str]) -> dict[str, Any]:
        async with self._semaphore:
            try:
                response = await self._client.get(symbol, params=params)
            except httpx.HTTPError as exc:
                raise ProviderUnavailableError(f"Yahoo request failed: {exc}") from exc
        if response.status_code == 404:
            raise SymbolNotFoundError(f"Unknown symbol '{symbol}'")
        if response.status_code >= 400:
            raise ProviderUnavailableError(f"Yahoo returned HTTP {response.status_code}")
        payload = response.json().get("chart", {})
        if payload.get("error") or not payload.get("result"):
            raise SymbolNotFoundError(f"No data for '{symbol}'")
        return payload["result"][0]

    async def _quote(self, symbol: str) -> Quote:
        result = await self._chart(symbol, {"range": "1d", "interval": "5m"})
        return _parse_quote(symbol, result["meta"])

    async def get_quotes(self, symbols: list[str]) -> dict[str, Quote]:
        results = await asyncio.gather(*(self._quote(s) for s in symbols), return_exceptions=True)
        quotes: dict[str, Quote] = {}
        for symbol, result in zip(symbols, results, strict=True):
            if isinstance(result, Quote):
                quotes[symbol] = result
            else:
                logger.warning("Quote for %s failed: %s", symbol, result)
        return quotes

    async def get_candles(self, symbol: str, range_: str, interval: str) -> list[Candle]:
        result = await self._chart(
            symbol, {"range": range_, "interval": interval, "includePrePost": "false"}
        )
        return _parse_candles(result)


def _parse_quote(symbol: str, meta: dict[str, Any]) -> Quote:
    price = float(meta["regularMarketPrice"])
    previous = float(meta.get("previousClose") or meta.get("chartPreviousClose") or price)
    change = price - previous
    listing = get_listing(symbol)
    name = listing.name if listing else meta.get("longName") or meta.get("shortName") or symbol
    timestamp = meta.get("regularMarketTime")
    return Quote(
        symbol=symbol,
        name=name,
        price=round(price, 4),
        previous_close=round(previous, 4),
        change=round(change, 4),
        change_percent=round(change / previous * 100, 4) if previous else 0.0,
        day_high=meta.get("regularMarketDayHigh"),
        day_low=meta.get("regularMarketDayLow"),
        volume=meta.get("regularMarketVolume"),
        currency=meta.get("currency") or "USD",
        market_state=_market_state(meta),
        updated_at=datetime.fromtimestamp(timestamp, UTC) if timestamp else datetime.now(UTC),
    )


def _market_state(meta: dict[str, Any]) -> str:
    regular = (meta.get("currentTradingPeriod") or {}).get("regular") or {}
    start, end = regular.get("start"), regular.get("end")
    if start is None or end is None:
        return "UNKNOWN"
    now = datetime.now(UTC).timestamp()
    return "OPEN" if start <= now < end else "CLOSED"


def _parse_candles(result: dict[str, Any]) -> list[Candle]:
    timestamps = result.get("timestamp") or []
    quote = ((result.get("indicators") or {}).get("quote") or [{}])[0]
    candles: list[Candle] = []
    for i, ts in enumerate(timestamps):
        values = [(quote.get(key) or [None] * len(timestamps))[i] for key in _OHLC]
        if any(v is None for v in values):
            continue  # Yahoo emits nulls for halted / partial bars
        o, h, low, c = (float(v) for v in values)
        volume = (quote.get("volume") or [None] * len(timestamps))[i] or 0
        candles.append(
            Candle(
                time=datetime.fromtimestamp(ts, UTC),
                open=round(o, 4),
                high=round(h, 4),
                low=round(low, 4),
                close=round(c, 4),
                volume=int(volume),
            )
        )
    return candles
