"""Offline market simulator.

Produces deterministic, realistic-looking history per symbol (GBM with
volatility clustering and mild momentum) and a live random walk for the
current session. Used for local development, demos, tests, and as a
fallback when no live data source is reachable.
"""

import math
import random
import threading
import zlib
from datetime import UTC, date, datetime, time, timedelta

import numpy as np

from app.data.universe import get_listing
from app.schemas.stock import Candle, Quote
from app.services.providers.base import MarketDataProvider

_TRADING_DAYS = 5 * 252
_SESSION_MINUTES = 390
_SESSION_OPEN_UTC = time(13, 30)


def _seed(*parts: object) -> int:
    return zlib.crc32("|".join(map(str, parts)).encode())


def _business_days_back(end: date, count: int) -> list[date]:
    days: list[date] = []
    cursor = end
    while len(days) < count:
        if cursor.weekday() < 5:
            days.append(cursor)
        cursor -= timedelta(days=1)
    return days[::-1]


class _SymbolState:
    def __init__(self, symbol: str, today: date) -> None:
        listing = get_listing(symbol)
        self.symbol = symbol
        self.name = listing.name if listing else symbol
        rng = np.random.default_rng(_seed(symbol))
        anchor = listing.base_price if listing else float(rng.uniform(20, 400))
        self.daily_vol = float(rng.uniform(0.012, 0.03))
        drift = float(rng.uniform(-0.0002, 0.0009))

        # GARCH(1,1)-style volatility with AR(1) momentum in returns.
        n = _TRADING_DAYS
        returns = np.empty(n)
        variance = self.daily_vol**2
        prev = 0.0
        for i in range(n):
            shock = rng.standard_normal()
            r = drift + 0.06 * prev + math.sqrt(variance) * shock
            variance = 0.05 * self.daily_vol**2 + 0.08 * r**2 + 0.87 * variance
            returns[i] = r
            prev = r
        closes = np.exp(np.cumsum(returns))
        closes *= anchor / closes[-1]

        self.days = _business_days_back(today - timedelta(days=1), n)
        self.closes = closes
        gaps = rng.normal(0, self.daily_vol * 0.3, n)
        self.opens = np.concatenate([[closes[0]], closes[:-1]]) * np.exp(gaps)
        spread = np.abs(rng.normal(0, self.daily_vol * 0.6, n))
        self.highs = np.maximum(self.opens, closes) * (1 + spread)
        self.lows = np.minimum(self.opens, closes) * (1 - spread)
        self.volumes = (rng.lognormal(16, 0.35, n) * (1 + np.abs(returns) * 20)).astype(int)

        # Live session state.
        self.previous_close = float(closes[-1])
        self.open = self.previous_close * math.exp(rng.normal(0, self.daily_vol * 0.3))
        self.price = self.open
        self.high = self.low = self.open
        self.volume = 0
        self.path: list[float] = [self.open]
        self.rng = random.Random(_seed(symbol, today))

    def tick(self, elapsed_seconds: float) -> None:
        # Scale daily vol to the tick interval; slightly amplified so the demo feels alive.
        sigma = self.daily_vol * math.sqrt(max(elapsed_seconds, 1.0) / (_SESSION_MINUTES * 60)) * 3
        self.price *= math.exp(self.rng.gauss(0, sigma))
        self.high = max(self.high, self.price)
        self.low = min(self.low, self.price)
        self.volume += self.rng.randint(1_000, 60_000)
        self.path.append(self.price)


class SimulatedProvider(MarketDataProvider):
    name = "simulated"
    is_live = False

    def __init__(self) -> None:
        self._states: dict[str, _SymbolState] = {}
        self._last_tick: dict[str, datetime] = {}
        self._lock = threading.Lock()

    def _state(self, symbol: str) -> _SymbolState:
        with self._lock:
            state = self._states.get(symbol)
            if state is None:
                state = _SymbolState(symbol, datetime.now(UTC).date())
                self._states[symbol] = state
                self._last_tick[symbol] = datetime.now(UTC)
            return state

    def _advance(self, symbol: str) -> _SymbolState:
        state = self._state(symbol)
        now = datetime.now(UTC)
        with self._lock:
            elapsed = (now - self._last_tick[symbol]).total_seconds()
            if elapsed >= 0.5:
                state.tick(elapsed)
                self._last_tick[symbol] = now
        return state

    async def get_quotes(self, symbols: list[str]) -> dict[str, Quote]:
        quotes: dict[str, Quote] = {}
        now = datetime.now(UTC)
        for symbol in symbols:
            s = self._advance(symbol)
            change = s.price - s.previous_close
            quotes[symbol] = Quote(
                symbol=symbol,
                name=s.name,
                price=round(s.price, 4),
                previous_close=round(s.previous_close, 4),
                change=round(change, 4),
                change_percent=round(change / s.previous_close * 100, 4),
                day_high=round(s.high, 4),
                day_low=round(s.low, 4),
                volume=s.volume,
                market_state="SIMULATED",
                updated_at=now,
            )
        return quotes

    async def get_candles(self, symbol: str, range_: str, interval: str) -> list[Candle]:
        s = self._advance(symbol)
        if range_ in ("1d", "5d"):
            return self._intraday(s, days=1 if range_ == "1d" else 5)
        days = {"1mo": 21, "3mo": 63, "6mo": 126, "1y": 252, "2y": 504, "5y": _TRADING_DAYS}
        count = days.get(range_, 252)
        candles = [
            Candle(
                time=datetime.combine(d, _SESSION_OPEN_UTC, UTC),
                open=round(float(s.opens[i]), 4),
                high=round(float(s.highs[i]), 4),
                low=round(float(s.lows[i]), 4),
                close=round(float(s.closes[i]), 4),
                volume=int(s.volumes[i]),
            )
            for i, d in enumerate(s.days)
        ][-(count - 1) :]
        candles.append(self._today_candle(s))
        if interval == "1wk":
            candles = _resample_weekly(candles)
        return candles

    @staticmethod
    def _today_candle(s: _SymbolState) -> Candle:
        return Candle(
            time=datetime.combine(datetime.now(UTC).date(), _SESSION_OPEN_UTC, UTC),
            open=round(s.open, 4),
            high=round(s.high, 4),
            low=round(s.low, 4),
            close=round(s.price, 4),
            volume=s.volume,
        )

    @staticmethod
    def _intraday(s: _SymbolState, days: int) -> list[Candle]:
        """Brownian bridges between known daily closes, ending at the live price."""
        bar_minutes = 5 if days == 1 else 30
        bars_per_day = _SESSION_MINUTES // bar_minutes
        anchors = [float(c) for c in s.closes[-days:]] + [s.price]
        session_days = s.days[-(days - 1) :] if days > 1 else []
        session_days = [*session_days, datetime.now(UTC).date()]
        rng = np.random.default_rng(_seed(s.symbol, "intraday", session_days[-1]))
        candles: list[Candle] = []
        for day_index, day in enumerate(session_days):
            start, end = anchors[day_index], anchors[day_index + 1]
            steps = rng.normal(0, s.daily_vol / math.sqrt(bars_per_day), bars_per_day)
            walk = np.cumsum(steps)
            bridge = walk - np.linspace(0, 1, bars_per_day) * walk[-1]
            path = start * np.exp(bridge + np.linspace(0, math.log(end / start), bars_per_day))
            opened = datetime.combine(day, _SESSION_OPEN_UTC, UTC)
            prev = start
            for i, close in enumerate(path):
                wiggle = abs(rng.normal(0, s.daily_vol / bars_per_day))
                candles.append(
                    Candle(
                        time=opened + timedelta(minutes=bar_minutes * i),
                        open=round(prev, 4),
                        high=round(max(prev, close) * (1 + wiggle), 4),
                        low=round(min(prev, close) * (1 - wiggle), 4),
                        close=round(float(close), 4),
                        volume=int(rng.lognormal(12, 0.4)),
                    )
                )
                prev = float(close)
        return candles


def _resample_weekly(candles: list[Candle]) -> list[Candle]:
    weeks: dict[tuple[int, int], list[Candle]] = {}
    for candle in candles:
        weeks.setdefault(candle.time.isocalendar()[:2], []).append(candle)
    return [
        Candle(
            time=group[0].time,
            open=group[0].open,
            high=max(c.high for c in group),
            low=min(c.low for c in group),
            close=group[-1].close,
            volume=sum(c.volume for c in group),
        )
        for group in weeks.values()
    ]
