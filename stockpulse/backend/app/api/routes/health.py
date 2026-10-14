from fastapi import APIRouter

from app.api.deps import MarketDep
from app.schemas.stock import Health

router = APIRouter(tags=["health"])


@router.get("/health", response_model=Health)
async def health(market: MarketDep) -> Health:
    return Health(
        provider=market.provider.name,
        live_data=market.provider.is_live,
        tracked_symbols=len(market.tracked_symbols),
        last_quote_refresh=market.last_refresh,
    )
