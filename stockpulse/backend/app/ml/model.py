"""Rise/fall classifier: a logistic-regression + gradient-boosting ensemble.

Each symbol gets its own model trained on its recent daily history. Skill is
measured with purged walk-forward validation, and the final probability is
shrunk toward 50% when the model fails to beat a naive baseline, so a weak
model can never produce a confident call.
"""

from dataclasses import dataclass

import numpy as np
from sklearn.ensemble import HistGradientBoostingClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import TimeSeriesSplit
from sklearn.pipeline import Pipeline, make_pipeline
from sklearn.preprocessing import StandardScaler

from app.core.errors import InsufficientDataError
from app.ml.features import FEATURE_LABELS, FEATURE_NAMES, FeatureSet

MIN_TRAINING_ROWS = 150
MODEL_NAME = "LogReg + GradientBoosting ensemble"


@dataclass(frozen=True, slots=True)
class DriverContribution:
    feature: str
    label: str
    value: float
    impact: float


@dataclass(frozen=True, slots=True)
class ModelResult:
    probability_up: float
    raw_probability: float
    validation_accuracy: float
    baseline_accuracy: float
    training_samples: int
    drivers: list[DriverContribution]


def _linear() -> Pipeline:
    return make_pipeline(StandardScaler(), LogisticRegression(C=0.3, max_iter=500))


def _boosted() -> HistGradientBoostingClassifier:
    return HistGradientBoostingClassifier(
        max_depth=3,
        learning_rate=0.05,
        max_iter=120,
        l2_regularization=1.0,
        min_samples_leaf=25,
        random_state=7,
    )


def _ensemble_proba(linear: Pipeline, boosted: HistGradientBoostingClassifier, X: np.ndarray):
    return 0.5 * linear.predict_proba(X)[:, 1] + 0.5 * boosted.predict_proba(X)[:, 1]


def _walk_forward_accuracy(X: np.ndarray, y: np.ndarray, horizon: int) -> tuple[float, float]:
    """Accuracy over expanding-window folds, with a gap so labels never overlap the test set."""
    splitter = TimeSeriesSplit(n_splits=4, gap=horizon)
    hits = total = majority_hits = 0
    for train_idx, test_idx in splitter.split(X):
        y_train, y_test = y[train_idx], y[test_idx]
        if len(np.unique(y_train)) < 2:
            continue
        X_train = X[train_idx]
        linear, boosted = _linear().fit(X_train, y_train), _boosted().fit(X_train, y_train)
        predicted = _ensemble_proba(linear, boosted, X[test_idx]) >= 0.5
        hits += int(np.sum(predicted == y_test.astype(bool)))
        majority = y_train.mean() >= 0.5
        majority_hits += int(np.sum(y_test.astype(bool) == majority))
        total += len(test_idx)
    if total == 0:
        return 0.5, 0.5
    return hits / total, majority_hits / total


def train_and_predict(features: FeatureSet, horizon: int) -> ModelResult:
    labeled = ~np.isnan(features.y)
    X, y = features.X[labeled], features.y[labeled]
    if len(y) < MIN_TRAINING_ROWS or len(np.unique(y)) < 2:
        raise InsufficientDataError("Not enough price history to train a model")

    accuracy, baseline = _walk_forward_accuracy(X, y, horizon)

    linear, boosted = _linear().fit(X, y), _boosted().fit(X, y)
    latest = features.latest.reshape(1, -1)
    raw = float(_ensemble_proba(linear, boosted, latest)[0])

    # Trust the signal in proportion to out-of-sample edge over the baseline.
    edge = accuracy - max(baseline, 0.5)
    trust = float(np.clip(0.35 + edge * 10, 0.2, 1.0))
    probability = 0.5 + (raw - 0.5) * trust

    return ModelResult(
        probability_up=float(np.clip(probability, 0.01, 0.99)),
        raw_probability=raw,
        validation_accuracy=accuracy,
        baseline_accuracy=baseline,
        training_samples=len(y),
        drivers=_drivers(linear, features.latest),
    )


def _drivers(linear: Pipeline, latest: np.ndarray, top_n: int = 5) -> list[DriverContribution]:
    """Per-feature contribution to the log-odds from the (interpretable) linear model."""
    scaler: StandardScaler = linear.named_steps["standardscaler"]
    model: LogisticRegression = linear.named_steps["logisticregression"]
    scaled = (latest - scaler.mean_) / np.where(scaler.scale_ == 0, 1, scaler.scale_)
    contributions = model.coef_[0] * scaled
    order = np.argsort(-np.abs(contributions))[:top_n]
    return [
        DriverContribution(
            feature=FEATURE_NAMES[i],
            label=FEATURE_LABELS[FEATURE_NAMES[i]],
            value=float(latest[i]),
            impact=float(contributions[i]),
        )
        for i in order
    ]
