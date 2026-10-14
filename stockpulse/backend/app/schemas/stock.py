from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field

HistoryRange = Literal["1d", "5d", "1mo", "3mo", "6mo", "1y", "5y"]


class Quote(BaseModel):
    symbol: str
    name: str
    price: float
    previous_close: float
    change: float
    change_percent: float
    day_high: float | None = None
    day_low: float | None = None
    volume: int | None = None
    currency: str = "USD"
    market_state: str = "UNKNOWN"
    updated_at: datetime


class Candle(BaseModel):
    time: datetime
    open: float
    high: float
    low: float
    close: float
    volume: int


class History(BaseModel):
    symbol: str
    range: HistoryRange
    interval: str
    candles: list[Candle]


class Listing(BaseModel):
    symbol: str
    name: str
    sector: str
    is_top_10: bool


class SearchResult(BaseModel):
    results: list[Listing]


class Health(BaseModel):
    status: Literal["ok"] = "ok"
    provider: str
    live_data: bool = Field(description="False when prices come from the built-in simulator.")
    tracked_symbols: int
    last_quote_refresh: datetime | None
