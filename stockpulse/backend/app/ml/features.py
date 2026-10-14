"""Technical-indicator feature engineering over daily OHLCV arrays."""

from dataclasses import dataclass

import numpy as np

# (key, human-readable label). Order defines the feature-matrix columns.
FEATURES: tuple[tuple[str, str], ...] = (
    ("ret_1d", "1-day momentum"),
    ("ret_5d", "1-week momentum"),
    ("ret_20d", "1-month momentum"),
    ("ret_60d", "3-month momentum"),
    ("rsi_14", "RSI (14)"),
    ("macd_hist", "MACD histogram"),
    ("dist_sma_20", "Distance from 20-day avg"),
    ("dist_sma_50", "Distance from 50-day avg"),
    ("sma_20_50", "20/50-day trend"),
    ("bb_pct_b", "Bollinger %B"),
    ("volatility_20d", "20-day volatility"),
    ("volume_ratio", "Volume vs 20-day avg"),
    ("stoch_k_14", "Stochastic %K"),
)
FEATURE_NAMES = tuple(name for name, _ in FEATURES)
FEATURE_LABELS = dict(FEATURES)
WARMUP = 60  # bars needed before every feature is defined


@dataclass(frozen=True, slots=True)
class FeatureSet:
    X: np.ndarray  # (n_rows, n_features), rows aligned to bars[WARMUP:]
    y: np.ndarray  # 1.0 if forward return > 0, NaN where the label is unknown
    latest: np.ndarray  # feature row for the most recent bar


def _sma(x: np.ndarray, window: int) -> np.ndarray:
    out = np.full_like(x, np.nan)
    if len(x) >= window:
        csum = np.cumsum(np.insert(x, 0, 0.0))
        out[window - 1 :] = (csum[window:] - csum[:-window]) / window
    return out


def _rolling_std(x: np.ndarray, window: int) -> np.ndarray:
    mean = _sma(x, window)
    mean_sq = _sma(x * x, window)
    return np.sqrt(np.maximum(mean_sq - mean * mean, 0.0))


def _rolling_extreme(x: np.ndarray, window: int, fn) -> np.ndarray:
    out = np.full_like(x, np.nan)
    if len(x) >= window:
        view = np.lib.stride_tricks.sliding_window_view(x, window)
        out[window - 1 :] = fn(view, axis=1)
    return out


def _ema(x: np.ndarray, span: int) -> np.ndarray:
    alpha = 2.0 / (span + 1)
    out = np.empty_like(x)
    out[0] = x[0]
    for i in range(1, len(x)):
        out[i] = alpha * x[i] + (1 - alpha) * out[i - 1]
    return out


def _rsi(close: np.ndarray, period: int = 14) -> np.ndarray:
    delta = np.diff(close, prepend=close[0])
    gains, losses = np.clip(delta, 0, None), np.clip(-delta, 0, None)
    alpha = 1.0 / period  # Wilder smoothing
    avg_gain, avg_loss = np.empty_like(close), np.empty_like(close)
    avg_gain[0], avg_loss[0] = gains[0], losses[0]
    for i in range(1, len(close)):
        avg_gain[i] = alpha * gains[i] + (1 - alpha) * avg_gain[i - 1]
        avg_loss[i] = alpha * losses[i] + (1 - alpha) * avg_loss[i - 1]
    rs = avg_gain / np.where(avg_loss == 0, np.nan, avg_loss)
    rsi = 100 - 100 / (1 + rs)
    return np.where(np.isnan(rsi), 100.0, rsi) / 100.0


def _pct_change(x: np.ndarray, periods: int) -> np.ndarray:
    out = np.full_like(x, np.nan)
    out[periods:] = x[periods:] / x[:-periods] - 1
    return out


def _lag(x: np.ndarray, periods: int) -> np.ndarray:
    out = np.full_like(x, np.nan)
    out[periods:] = x[:-periods]
    return out


def build_features(
    close: np.ndarray,
    high: np.ndarray,
    low: np.ndarray,
    volume: np.ndarray,
    horizon: int,
) -> FeatureSet:
    close, high, low = (np.asarray(a, dtype=float) for a in (close, high, low))
    volume = np.asarray(volume, dtype=float)

    sma20, sma50 = _sma(close, 20), _sma(close, 50)
    std20 = _rolling_std(close, 20)
    macd = _ema(close, 12) - _ema(close, 26)
    hh14, ll14 = _rolling_extreme(high, 14, np.max), _rolling_extreme(low, 14, np.min)
    daily_ret = _pct_change(close, 1)
    avg_vol = _sma(volume, 20)

    columns = {
        "ret_1d": daily_ret,
        "ret_5d": _pct_change(close, 5),
        "ret_20d": _pct_change(close, 20),
        "ret_60d": _pct_change(close, 60),
        "rsi_14": _rsi(close),
        "macd_hist": (macd - _ema(macd, 9)) / close,
        "dist_sma_20": close / sma20 - 1,
        "dist_sma_50": close / sma50 - 1,
        "sma_20_50": sma20 / sma50 - 1,
        "bb_pct_b": (close - (sma20 - 2 * std20)) / np.where(std20 == 0, np.nan, 4 * std20),
        "volatility_20d": _rolling_std(np.nan_to_num(daily_ret), 20),
        # Lagged one bar: the latest bar is usually an in-progress session with partial volume.
        "volume_ratio": _lag(np.log((volume + 1) / (avg_vol + 1)), 1),
        "stoch_k_14": (close - ll14) / np.where(hh14 == ll14, np.nan, hh14 - ll14),
    }
    matrix = np.column_stack([columns[name] for name in FEATURE_NAMES])
    matrix = np.nan_to_num(matrix[WARMUP:], nan=0.0, posinf=0.0, neginf=0.0)

    forward = np.full_like(close, np.nan)
    forward[:-horizon] = close[horizon:] / close[:-horizon] - 1
    labels = np.where(np.isnan(forward), np.nan, (forward > 0).astype(float))[WARMUP:]

    return FeatureSet(X=matrix, y=labels, latest=matrix[-1])
