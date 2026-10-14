"""In-process pub/sub fan-out for WebSocket clients."""

import asyncio
import contextlib
from collections.abc import AsyncIterator
from typing import Any


class Broadcaster:
    def __init__(self, queue_size: int = 16) -> None:
        self._queues: set[asyncio.Queue[dict[str, Any]]] = set()
        self._queue_size = queue_size

    @property
    def subscriber_count(self) -> int:
        return len(self._queues)

    def publish(self, message: dict[str, Any]) -> None:
        for queue in self._queues:
            if queue.full():  # slow consumer: drop the stalest message rather than block
                with contextlib.suppress(asyncio.QueueEmpty):
                    queue.get_nowait()
            queue.put_nowait(message)

    @contextlib.asynccontextmanager
    async def subscribe(self) -> AsyncIterator[asyncio.Queue[dict[str, Any]]]:
        queue: asyncio.Queue[dict[str, Any]] = asyncio.Queue(self._queue_size)
        self._queues.add(queue)
        try:
            yield queue
        finally:
            self._queues.discard(queue)
