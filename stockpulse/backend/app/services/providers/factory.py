import logging

from app.core.config import Settings
from app.services.providers.base import MarketDataProvider
from app.services.providers.simulated import SimulatedProvider
from app.services.providers.yahoo import YahooFinanceProvider

logger = logging.getLogger(__name__)

_PROBE_SYMBOL = "AAPL"


async def create_provider(settings: Settings) -> MarketDataProvider:
    """Build the configured provider. ``auto`` probes Yahoo and falls back to the simulator."""
    if settings.provider == "simulated":
        return SimulatedProvider()

    yahoo = YahooFinanceProvider(timeout=settings.http_timeout_seconds)
    if settings.provider == "yahoo":
        return yahoo

    if await yahoo.get_quotes([_PROBE_SYMBOL]):
        logger.info("Using live Yahoo Finance data")
        return yahoo
    await yahoo.aclose()
    logger.warning("Yahoo Finance unreachable; falling back to the market simulator")
    return SimulatedProvider()
