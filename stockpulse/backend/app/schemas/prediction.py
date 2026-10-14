from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field

Signal = Literal["bullish", "neutral", "bearish"]


class Driver(BaseModel):
    feature: str
    label: str
    value: float
    impact: float = Field(description="Signed contribution to the log-odds of a rise.")


class Prediction(BaseModel):
    symbol: str
    score: int = Field(ge=0, le=100, description="Probability of a rise over the horizon, x100.")
    probability_up: float = Field(ge=0, le=1)
    signal: Signal
    confidence: Literal["low", "medium", "high"]
    horizon_days: int
    model: str
    validation_accuracy: float = Field(description="Walk-forward accuracy on held-out data.")
    baseline_accuracy: float = Field(
        description="Accuracy of always predicting the majority class."
    )
    training_samples: int
    drivers: list[Driver]
    generated_at: datetime
    disclaimer: str = "Statistical estimate for educational use only. Not financial advice."
