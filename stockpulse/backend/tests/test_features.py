import numpy as np

from app.ml.features import FEATURE_NAMES, WARMUP, _rsi, _sma, build_features


def _series(n: int = 300, seed: int = 0):
    rng = np.random.default_rng(seed)
    close = 100 * np.exp(np.cumsum(rng.normal(0, 0.01, n)))
    return close, close * 1.01, close * 0.99, rng.uniform(1e6, 2e6, n)


def test_shapes_and_labels_align():
    close, high, low, volume = _series()
    features = build_features(close, high, low, volume, horizon=5)
    assert features.X.shape == (300 - WARMUP, len(FEATURE_NAMES))
    assert np.isfinite(features.X).all()
    # The last `horizon` rows have no future price, so no label.
    assert np.isnan(features.y[-5:]).all()
    assert set(np.unique(features.y[:-5])) <= {0.0, 1.0}
    expected = (close[WARMUP + 5] > close[WARMUP]).astype(float)
    assert features.y[0] == expected


def test_sma_matches_naive_mean():
    x = np.arange(10, dtype=float)
    assert np.allclose(_sma(x, 3)[2:], [np.mean(x[i - 2 : i + 1]) for i in range(2, 10)])
    assert np.isnan(_sma(x, 3)[:2]).all()


def test_rsi_bounds_and_extremes():
    rising = np.linspace(10, 20, 50)
    assert _rsi(rising)[-1] > 0.99
    falling = rising[::-1]
    assert _rsi(falling)[-1] < 0.01
    rng = np.random.default_rng(1)
    noisy = 100 + np.cumsum(rng.normal(0, 1, 200))
    values = _rsi(noisy)
    assert ((values >= 0) & (values <= 1)).all()
