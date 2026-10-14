from collections.abc import Iterator

import pytest
from fastapi.testclient import TestClient

from app.core.config import Settings
from app.main import create_app
from app.services.providers.simulated import SimulatedProvider


@pytest.fixture
def settings() -> Settings:
    return Settings(provider="simulated", quote_interval_seconds=1.0, log_level="WARNING")


@pytest.fixture
def client(settings: Settings) -> Iterator[TestClient]:
    app = create_app(settings=settings, provider=SimulatedProvider())
    with TestClient(app) as test_client:
        yield test_client
