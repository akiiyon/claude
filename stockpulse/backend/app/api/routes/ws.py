"""Live quote stream.

Server -> client: ``{"type": "snapshot" | "quotes", "data": [Quote, ...]}``
Client -> server: ``{"action": "subscribe" | "unsubscribe", "symbols": ["AMD", ...]}``

The top 10 are always included; subscriptions add extra symbols to the
refresh loop for as long as the socket is open.
"""

import asyncio
import contextlib
import logging
from typing import Any

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from app.core.errors import StockPulseError
from app.services.market import MarketService, normalize_symbol

router = APIRouter()
logger = logging.getLogger(__name__)


@router.websocket("/ws/quotes")
async def quotes_stream(websocket: WebSocket) -> None:
    market: MarketService = websocket.app.state.market
    max_subs: int = websocket.app.state.settings.max_ws_subscriptions
    await websocket.accept()
    subscribed: set[str] = set()

    async def pump(queue: asyncio.Queue[dict[str, Any]]) -> None:
        while True:
            await websocket.send_json(await queue.get())

    try:
        async with market.broadcaster.subscribe() as queue:
            snapshot = await market.top_quotes()
            await websocket.send_json(
                {"type": "snapshot", "data": [q.model_dump(mode="json") for q in snapshot]}
            )
            sender = asyncio.create_task(pump(queue))
            try:
                while True:
                    message = await websocket.receive_json()
                    await _handle(message, websocket, market, subscribed, max_subs)
            finally:
                sender.cancel()
                with contextlib.suppress(asyncio.CancelledError, WebSocketDisconnect):
                    await sender
    except WebSocketDisconnect:
        pass
    finally:
        market.unsubscribe(list(subscribed))


async def _handle(
    message: Any,
    websocket: WebSocket,
    market: MarketService,
    subscribed: set[str],
    max_subs: int,
) -> None:
    if not isinstance(message, dict) or not isinstance(message.get("symbols"), list):
        await websocket.send_json({"type": "error", "message": "Malformed message"})
        return
    action = message.get("action")
    try:
        symbols = {normalize_symbol(str(s)) for s in message["symbols"][:max_subs]}
    except StockPulseError as exc:
        await websocket.send_json({"type": "error", "message": exc.message})
        return

    if action == "subscribe":
        new = sorted(symbols - subscribed)[: max(0, max_subs - len(subscribed))]
        subscribed.update(new)
        market.subscribe(new)
        if new:
            quotes = await market.get_quotes(new)
            await websocket.send_json(
                {"type": "quotes", "data": [q.model_dump(mode="json") for q in quotes]}
            )
    elif action == "unsubscribe":
        removed = sorted(symbols & subscribed)
        subscribed.difference_update(removed)
        market.unsubscribe(removed)
    else:
        await websocket.send_json({"type": "error", "message": f"Unknown action '{action}'"})
