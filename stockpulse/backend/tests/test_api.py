from fastapi.testclient import TestClient

from app.data.universe import TOP_10


def test_health_reports_simulator(client: TestClient):
    body = client.get("/api/v1/health").json()
    assert body["provider"] == "simulated"
    assert body["live_data"] is False


def test_top_ten(client: TestClient):
    body = client.get("/api/v1/stocks/top").json()
    assert [q["symbol"] for q in body] == list(TOP_10)


def test_search(client: TestClient):
    results = client.get("/api/v1/stocks/search", params={"q": "nvid"}).json()["results"]
    assert results[0]["symbol"] == "NVDA"
    assert results[0]["is_top_10"] is True


def test_unknown_and_invalid_symbols(client: TestClient):
    unknown = client.get("/api/v1/stocks/ZZZZ/quote")
    assert unknown.status_code == 404
    assert unknown.json()["error"]["code"] == "symbol_not_found"
    assert client.get("/api/v1/stocks/b@d/quote").status_code == 422


def test_history_ranges(client: TestClient):
    body = client.get("/api/v1/stocks/tsla/history", params={"range": "3mo"}).json()
    assert body["symbol"] == "TSLA"
    assert body["interval"] == "1d"
    assert len(body["candles"]) == 63
    assert client.get("/api/v1/stocks/TSLA/history", params={"range": "7y"}).status_code == 422


def test_prediction(client: TestClient):
    body = client.get("/api/v1/stocks/AAPL/prediction").json()
    assert 0 <= body["score"] <= 100
    assert body["signal"] in {"bullish", "neutral", "bearish"}
    assert body["horizon_days"] == 5
    assert body["drivers"]


def test_compare(client: TestClient):
    response = client.get("/api/v1/compare", params={"symbols": "AAPL,MSFT,AAPL", "range": "1y"})
    body = response.json()
    assert body["symbols"] == ["AAPL", "MSFT"]
    assert body["performance"][0]["values"] == {"AAPL": 0.0, "MSFT": 0.0}
    assert body["correlation"]["AAPL"]["AAPL"] == 1.0
    assert len(body["stats"]) == len(body["predictions"]) == 2


def test_compare_validation(client: TestClient):
    assert client.get("/api/v1/compare", params={"symbols": "AAPL"}).status_code == 422
    too_many = "AAPL,MSFT,NVDA,TSLA,AMD"
    assert client.get("/api/v1/compare", params={"symbols": too_many}).status_code == 422


def test_websocket_snapshot_and_subscribe(client: TestClient):
    with client.websocket_connect("/api/v1/ws/quotes") as ws:
        snapshot = ws.receive_json()
        assert snapshot["type"] == "snapshot"
        assert len(snapshot["data"]) == 10
        ws.send_json({"action": "subscribe", "symbols": ["AMD"]})
        update = ws.receive_json()
        while update["type"] != "quotes" or "AMD" not in {q["symbol"] for q in update["data"]}:
            update = ws.receive_json()
        assert "AMD" in client.app.state.market.tracked_symbols
        ws.send_json({"action": "dance"})
        error = ws.receive_json()
        while error["type"] != "error":
            error = ws.receive_json()
        assert error["message"] == "Malformed message"
