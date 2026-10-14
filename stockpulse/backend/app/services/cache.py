import time
from typing import Generic, TypeVar

T = TypeVar("T")


class TTLCache(Generic[T]):
    """Minimal monotonic-clock TTL cache (single event loop, no locking needed)."""

    def __init__(self, max_entries: int = 512) -> None:
        self._data: dict[str, tuple[float, T]] = {}
        self._max_entries = max_entries

    def get(self, key: str) -> T | None:
        entry = self._data.get(key)
        if entry is None:
            return None
        expires_at, value = entry
        if time.monotonic() >= expires_at:
            del self._data[key]
            return None
        return value

    def set(self, key: str, value: T, ttl_seconds: float) -> None:
        if len(self._data) >= self._max_entries:
            oldest = min(self._data, key=lambda k: self._data[k][0])
            del self._data[oldest]
        self._data[key] = (time.monotonic() + ttl_seconds, value)
