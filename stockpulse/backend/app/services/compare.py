"""Side-by-side analytics for a basket of symbols."""

import asyncio
import math
from datetime import datetime

import numpy as np

from app.core.errors import InsufficientDataError
from app.ml.service import PredictionService
from app.schemas.compare import Comparison, PerformancePoint, RiskStats
from app.schemas.stock import Candle, HistoryRange
from app.services.market import MarketService

TRADING_DAYS_PER_YEAR = 252


def _align(series: dict[str, list[Candle]]) -> tuple[list[datetime], dict[str, np.ndarray]]:
    """Keep only bars present for every symbol (keyed by calendar date)."""
    by_date = {symbol: {c.time.date(): c for c in candles} for symbol, candles in series.items()}
    common = sorted(set.intersection(*(set(d) for d in by_date.values())))
    first = next(iter(by_date))
    times = [by_date[first][day].time for day in common]
    closes = {s: np.array([by_date[s][day].close for day in common]) for s in series}
    return times, closes


def risk_stats(symbol: str, closes: np.ndarray) -> RiskStats:
    returns = np.diff(closes) / closes[:-1]
    volatility = float(np.std(returns, ddof=1)) if len(returns) > 1 else 0.0
    mean = float(np.mean(returns)) if len(returns) else 0.0
    running_peak = np.maximum.accumulate(closes)
    drawdown = float(np.min(closes / running_peak - 1))
    sharpe = mean / volatility * math.sqrt(TRADING_DAYS_PER_YEAR) if volatility else 0.0
    return RiskStats(
        symbol=symbol,
        period_return=round(float(closes[-1] / closes[0] - 1) * 100, 2),
        annualized_volatility=round(volatility * math.sqrt(TRADING_DAYS_PER_YEAR) * 100, 2),
        max_drawdown=round(drawdown * 100, 2),
        sharpe_ratio=round(sharpe, 2),
        best_day=round(float(np.max(returns)) * 100, 2) if len(returns) else 0.0,
        worst_day=round(float(np.min(returns)) * 100, 2) if len(returns) else 0.0,
    )


class CompareService:
    def __init__(self, market: MarketService, predictions: PredictionService) -> None:
        self._market = market
        self._predictions = predictions

    async def compare(self, symbols: list[str], range_: HistoryRange) -> Comparison:
        # Daily bars make stats comparable across ranges; intraday ranges fall back to 1mo.
        stats_range = range_ if range_ not in ("1d", "5d") else "1mo"
        interval = "1wk" if stats_range == "5y" else "1d"

        histories, quotes, predictions = await asyncio.gather(
            asyncio.gather(*(self._market.get_candles(s, stats_range, interval) for s in symbols)),
            self._market.get_quotes(symbols),
            asyncio.gather(*(self._predictions.predict(s) for s in symbols)),
        )
        times, closes = _align(dict(zip(symbols, histories, strict=True)))
        if len(times) < 3:
            raise InsufficientDataError("Not enough overlapping history to compare these symbols")

        performance = [
            PerformancePoint(
                time=t,
                values={s: round(float(closes[s][i] / closes[s][0] - 1) * 100, 3) for s in symbols},
            )
            for i, t in enumerate(times)
        ]
        returns = np.vstack([np.diff(closes[s]) / closes[s][:-1] for s in symbols])
        corr = np.corrcoef(returns) if len(symbols) > 1 else np.ones((1, 1))
        correlation = {
            a: {b: round(float(corr[i, j]), 3) for j, b in enumerate(symbols)}
            for i, a in enumerate(symbols)
        }
        return Comparison(
            symbols=symbols,
            range=stats_range,
            quotes=quotes,
            performance=performance,
            stats=[risk_stats(s, closes[s]) for s in symbols],
            predictions=list(predictions),
            correlation=correlation,
        )
