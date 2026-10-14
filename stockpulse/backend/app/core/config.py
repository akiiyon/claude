"""Application settings, loaded from environment variables (prefix ``STOCKPULSE_``)."""

from functools import lru_cache
from typing import Annotated, Literal

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, NoDecode, SettingsConfigDict

ProviderName = Literal["auto", "yahoo", "simulated"]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_prefix="STOCKPULSE_", env_file=".env", env_file_encoding="utf-8", extra="ignore"
    )

    app_name: str = "StockPulse API"
    api_prefix: str = "/api/v1"
    log_level: str = "INFO"

    provider: ProviderName = "auto"
    quote_interval_seconds: float = Field(default=5.0, ge=1.0, le=300.0)
    prediction_ttl_minutes: int = Field(default=15, ge=1, le=24 * 60)
    history_cache_seconds: int = Field(default=300, ge=10)
    http_timeout_seconds: float = Field(default=8.0, gt=0)

    max_compare_symbols: int = Field(default=4, ge=2, le=8)
    max_ws_subscriptions: int = Field(default=10, ge=1, le=50)

    cors_origins: Annotated[list[str], NoDecode] = ["http://localhost:5173"]

    @field_validator("cors_origins", mode="before")
    @classmethod
    def _split_origins(cls, value: object) -> object:
        if isinstance(value, str):
            return [origin.strip() for origin in value.split(",") if origin.strip()]
        return value


@lru_cache
def get_settings() -> Settings:
    return Settings()
