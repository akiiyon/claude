from datetime import datetime

from pydantic import BaseModel

from app.schemas.prediction import Prediction
from app.schemas.stock import HistoryRange, Quote


class PerformancePoint(BaseModel):
    time: datetime
    values: dict[str, float]  # symbol -> % change since start of range


class RiskStats(BaseModel):
    symbol: str
    period_return: float
    annualized_volatility: float
    max_drawdown: float
    sharpe_ratio: float
    best_day: float
    worst_day: float


class Comparison(BaseModel):
    symbols: list[str]
    range: HistoryRange
    quotes: list[Quote]
    performance: list[PerformancePoint]
    stats: list[RiskStats]
    predictions: list[Prediction]
    correlation: dict[str, dict[str, float]]
