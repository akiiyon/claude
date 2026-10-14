from typing import Annotated

from fastapi import Depends, Path, Request

from app.ml.service import PredictionService
from app.services.compare import CompareService
from app.services.market import MarketService, normalize_symbol


def get_market(request: Request) -> MarketService:
    return request.app.state.market


def get_predictions(request: Request) -> PredictionService:
    return request.app.state.predictions


def get_compare(request: Request) -> CompareService:
    return request.app.state.compare


def symbol_path(symbol: Annotated[str, Path(min_length=1, max_length=10)]) -> str:
    return normalize_symbol(symbol)


MarketDep = Annotated[MarketService, Depends(get_market)]
PredictionDep = Annotated[PredictionService, Depends(get_predictions)]
CompareDep = Annotated[CompareService, Depends(get_compare)]
SymbolDep = Annotated[str, Depends(symbol_path)]
