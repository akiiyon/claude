from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import APIRouter, FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import JSONResponse

from app.api.routes import compare, health, stocks, ws
from app.core.config import Settings, get_settings
from app.core.errors import StockPulseError
from app.core.logging import configure_logging
from app.ml.service import PredictionService
from app.services.compare import CompareService
from app.services.market import MarketService
from app.services.providers.base import MarketDataProvider
from app.services.providers.factory import create_provider


def create_app(
    settings: Settings | None = None, provider: MarketDataProvider | None = None
) -> FastAPI:
    settings = settings or get_settings()
    configure_logging(settings.log_level)

    @asynccontextmanager
    async def lifespan(app: FastAPI) -> AsyncIterator[None]:
        market = MarketService(provider or await create_provider(settings), settings)
        predictions = PredictionService(market, settings)
        app.state.settings = settings
        app.state.market = market
        app.state.predictions = predictions
        app.state.compare = CompareService(market, predictions)
        await market.start()
        try:
            yield
        finally:
            await market.stop()

    app = FastAPI(title=settings.app_name, version="1.0.0", lifespan=lifespan)
    app.add_middleware(GZipMiddleware, minimum_size=1024)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_methods=["GET"],
        allow_headers=["*"],
    )

    @app.exception_handler(StockPulseError)
    async def _domain_error(_: Request, exc: StockPulseError) -> JSONResponse:
        return JSONResponse(
            status_code=exc.status_code,
            content={"error": {"code": exc.code, "message": exc.message}},
        )

    api = APIRouter(prefix=settings.api_prefix)
    for module in (health, stocks, compare, ws):
        api.include_router(module.router)
    app.include_router(api)
    return app


app = create_app()
