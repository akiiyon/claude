from typing import Annotated

from fastapi import APIRouter, Query

from app.api.deps import MarketDep, PredictionDep, SymbolDep
from app.data import universe
from app.schemas.prediction import Prediction
from app.schemas.stock import History, HistoryRange, Listing, Quote, SearchResult

router = APIRouter(prefix="/stocks", tags=["stocks"])


@router.get("/top", response_model=list[Quote], summary="Live quotes for the top 10")
async def top_stocks(market: MarketDep) -> list[Quote]:
    return await market.top_quotes()


@router.get("/search", response_model=SearchResult)
async def search_stocks(
    q: Annotated[str, Query(max_length=40)] = "",
    limit: Annotated[int, Query(ge=1, le=25)] = 10,
) -> SearchResult:
    return SearchResult(
        results=[
            Listing(
                symbol=item.symbol,
                name=item.name,
                sector=item.sector,
                is_top_10=item.symbol in universe.TOP_10,
            )
            for item in universe.search(q, limit)
        ]
    )


@router.get("/{symbol}/quote", response_model=Quote)
async def stock_quote(symbol: SymbolDep, market: MarketDep) -> Quote:
    return await market.get_quote(symbol)


@router.get("/{symbol}/history", response_model=History)
async def stock_history(
    symbol: SymbolDep,
    market: MarketDep,
    range: Annotated[HistoryRange, Query()] = "1mo",  # noqa: A002 - public query param name
) -> History:
    return await market.get_history(symbol, range)


@router.get(
    "/{symbol}/prediction",
    response_model=Prediction,
    summary="Model score for the chance the stock rises over the next 5 trading days",
)
async def stock_prediction(symbol: SymbolDep, predictions: PredictionDep) -> Prediction:
    return await predictions.predict(symbol)
