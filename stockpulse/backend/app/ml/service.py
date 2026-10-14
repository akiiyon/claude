import asyncio
import logging
from datetime import UTC, datetime

import numpy as np

from app.core.config import Settings
from app.ml.features import build_features
from app.ml.model import MODEL_NAME, ModelResult, train_and_predict
from app.schemas.prediction import Driver, Prediction, Signal
from app.services.cache import TTLCache
from app.services.market import MarketService

logger = logging.getLogger(__name__)

HORIZON_DAYS = 5
TRAINING_RANGE = "2y"
BULLISH_THRESHOLD = 0.55
BEARISH_THRESHOLD = 0.45


class PredictionService:
    def __init__(self, market: MarketService, settings: Settings) -> None:
        self._market = market
        self._ttl = settings.prediction_ttl_minutes * 60
        self._cache: TTLCache[Prediction] = TTLCache()
        self._locks: dict[str, asyncio.Lock] = {}

    async def predict(self, symbol: str) -> Prediction:
        cached = self._cache.get(symbol)
        if cached:
            return cached
        lock = self._locks.setdefault(symbol, asyncio.Lock())
        async with lock:  # one training run per symbol, concurrent callers share it
            cached = self._cache.get(symbol)
            if cached:
                return cached
            candles = await self._market.get_candles(symbol, TRAINING_RANGE, "1d")
            close = np.array([c.close for c in candles])
            high = np.array([c.high for c in candles])
            low = np.array([c.low for c in candles])
            volume = np.array([c.volume for c in candles], dtype=float)
            features = build_features(close, high, low, volume, HORIZON_DAYS)
            result = await asyncio.to_thread(train_and_predict, features, HORIZON_DAYS)
            prediction = _to_schema(symbol, result)
            self._cache.set(symbol, prediction, self._ttl)
            logger.info(
                "Trained %s: p_up=%.3f acc=%.3f baseline=%.3f",
                symbol,
                result.probability_up,
                result.validation_accuracy,
                result.baseline_accuracy,
            )
            return prediction


def _signal(probability: float) -> Signal:
    if probability >= BULLISH_THRESHOLD:
        return "bullish"
    if probability <= BEARISH_THRESHOLD:
        return "bearish"
    return "neutral"


def _to_schema(symbol: str, result: ModelResult) -> Prediction:
    distance = abs(result.probability_up - 0.5)
    edge = result.validation_accuracy - result.baseline_accuracy
    if distance >= 0.12 and edge > 0.02:
        confidence = "high"
    elif distance >= 0.06:
        confidence = "medium"
    else:
        confidence = "low"
    return Prediction(
        symbol=symbol,
        score=round(result.probability_up * 100),
        probability_up=round(result.probability_up, 4),
        signal=_signal(result.probability_up),
        confidence=confidence,
        horizon_days=HORIZON_DAYS,
        model=MODEL_NAME,
        validation_accuracy=round(result.validation_accuracy, 4),
        baseline_accuracy=round(result.baseline_accuracy, 4),
        training_samples=result.training_samples,
        drivers=[
            Driver(
                feature=d.feature,
                label=d.label,
                value=round(d.value, 5),
                impact=round(d.impact, 4),
            )
            for d in result.drivers
        ],
        generated_at=datetime.now(UTC),
    )
