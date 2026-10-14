import numpy as np
import pytest

from app.core.errors import InsufficientDataError
from app.ml.features import FEATURE_NAMES, FeatureSet, build_features
from app.ml.model import train_and_predict


def test_predicts_valid_probability_on_random_walk():
    rng = np.random.default_rng(3)
    close = 100 * np.exp(np.cumsum(rng.normal(0, 0.015, 500)))
    features = build_features(close, close * 1.01, close * 0.99, rng.uniform(1e6, 2e6, 500), 5)
    result = train_and_predict(features, horizon=5)
    assert 0 < result.probability_up < 1
    # On pure noise the model has no edge, so it must stay near a coin flip.
    assert abs(result.probability_up - 0.5) < 0.2
    assert len(result.drivers) == 5
    assert {d.feature for d in result.drivers} <= set(FEATURE_NAMES)


def test_learns_a_real_signal():
    """If tomorrow's direction is encoded in a feature, validation accuracy must reflect it."""
    rng = np.random.default_rng(4)
    n = 600
    X = rng.normal(size=(n, len(FEATURE_NAMES)))
    y = (X[:, 0] > 0).astype(float)
    y[-5:] = np.nan
    latest = np.zeros(len(FEATURE_NAMES))
    latest[0] = 2.5
    result = train_and_predict(FeatureSet(X=X, y=y, latest=latest), horizon=5)
    assert result.validation_accuracy > 0.85
    assert result.probability_up > 0.8
    assert result.drivers[0].feature == FEATURE_NAMES[0]


def test_rejects_short_history():
    X = np.zeros((50, len(FEATURE_NAMES)))
    y = np.tile([0.0, 1.0], 25)
    with pytest.raises(InsufficientDataError):
        train_and_predict(FeatureSet(X=X, y=y, latest=X[-1]), horizon=5)
