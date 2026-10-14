from app.services.providers.simulated import SimulatedProvider
from app.services.providers.yahoo import _parse_candles, _parse_quote


async def test_simulator_is_deterministic_and_consistent():
    a, b = SimulatedProvider(), SimulatedProvider()
    hist_a = await a.get_candles("AAPL", "1y", "1d")
    hist_b = await b.get_candles("AAPL", "1y", "1d")
    assert [c.close for c in hist_a[:-1]] == [c.close for c in hist_b[:-1]]
    assert len(hist_a) == 252
    assert all(c.low <= min(c.open, c.close) and c.high >= max(c.open, c.close) for c in hist_a)

    quote = (await a.get_quotes(["AAPL"]))["AAPL"]
    intraday = await a.get_candles("AAPL", "1d", "5m")
    assert intraday[-1].close == quote.price
    assert quote.previous_close == hist_a[-2].close


async def test_simulator_weekly_resample():
    candles = await SimulatedProvider().get_candles("MSFT", "5y", "1wk")
    assert 250 <= len(candles) <= 265
    times = [c.time for c in candles]
    assert times == sorted(times)


def test_yahoo_quote_parsing():
    meta = {
        "regularMarketPrice": 110.0,
        "previousClose": 100.0,
        "regularMarketDayHigh": 111.0,
        "regularMarketDayLow": 99.0,
        "regularMarketVolume": 12345,
        "currency": "USD",
        "regularMarketTime": 1_700_000_000,
    }
    quote = _parse_quote("AAPL", meta)
    assert quote.name == "Apple Inc."
    assert quote.change == 10.0
    assert quote.change_percent == 10.0
    assert quote.market_state == "UNKNOWN"


def test_yahoo_candles_skip_null_bars():
    result = {
        "timestamp": [1, 2, 3],
        "indicators": {
            "quote": [
                {
                    "open": [1.0, None, 3.0],
                    "high": [1.5, 2.5, 3.5],
                    "low": [0.5, 1.5, 2.5],
                    "close": [1.2, 2.2, 3.2],
                    "volume": [10, 20, None],
                }
            ]
        },
    }
    candles = _parse_candles(result)
    assert [c.close for c in candles] == [1.2, 3.2]
    assert candles[-1].volume == 0
