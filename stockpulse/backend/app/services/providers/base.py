from abc import ABC, abstractmethod

from app.schemas.stock import Candle, Quote

# Chart range -> bar interval used when rendering history.
RANGE_INTERVALS: dict[str, str] = {
    "1d": "5m",
    "5d": "30m",
    "1mo": "1d",
    "3mo": "1d",
    "6mo": "1d",
    "1y": "1d",
    "5y": "1wk",
}


class MarketDataProvider(ABC):
    """Source of quotes and OHLCV candles. Implementations must be safe to share."""

    name: str
    is_live: bool

    @abstractmethod
    async def get_quotes(self, symbols: list[str]) -> dict[str, Quote]:
        """Latest quote per symbol. Symbols that fail are omitted, not raised."""

    @abstractmethod
    async def get_candles(self, symbol: str, range_: str, interval: str) -> list[Candle]:
        """OHLCV bars, oldest first."""

    async def aclose(self) -> None:  # noqa: B027 - optional hook
        """Release network resources."""
