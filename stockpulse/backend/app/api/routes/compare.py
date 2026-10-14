from typing import Annotated

from fastapi import APIRouter, Query, Request

from app.api.deps import CompareDep
from app.core.errors import InvalidRequestError
from app.schemas.compare import Comparison
from app.schemas.stock import HistoryRange
from app.services.market import normalize_symbol

router = APIRouter(tags=["compare"])


@router.get("/compare", response_model=Comparison)
async def compare_stocks(
    request: Request,
    service: CompareDep,
    symbols: Annotated[str, Query(description="Comma-separated tickers, e.g. AAPL,MSFT")],
    range: Annotated[HistoryRange, Query()] = "6mo",  # noqa: A002 - public query param name
) -> Comparison:
    limit = request.app.state.settings.max_compare_symbols
    parsed = list(dict.fromkeys(normalize_symbol(s) for s in symbols.split(",") if s.strip()))
    if not 2 <= len(parsed) <= limit:
        raise InvalidRequestError(f"Pick between 2 and {limit} distinct symbols")
    return await service.compare(parsed, range)
