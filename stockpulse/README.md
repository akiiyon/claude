# StockPulse 📈

Live stock prices, side-by-side comparisons, and an ML model that scores whether each stock is likely to rise or fall over the next 5 trading days.

- **Backend:** Python 3.11+, FastAPI, WebSockets, scikit-learn
- **Frontend:** React 19, TypeScript, Vite, Tailwind CSS v4, Framer Motion, Recharts, TanStack Query

## Features

- **Always-live top 10** (AAPL, MSFT, NVDA, GOOGL, AMZN, META, AVGO, TSLA, BRK-B, JPM). The server pushes quotes over a WebSocket on a fixed interval. Prices flash when they tick, and the dashboard shows a ticker tape, sparklines and market-mood tiles.
- **Stock pages** with 1D–5Y charts, day stats and the AI rise score with its top drivers.
- **Compare** 2–4 stocks: an overlay of % return, a risk table (volatility, max drawdown, Sharpe ratio, best and worst day), a correlation matrix, and the model's verdict for each stock. The selection lives in the URL, so a comparison can be shared as a link. Compared stocks are streamed live too.
- **Search** across about 55 listed tickers (press `/` to focus it).

## Quick start

```bash
# Backend (http://localhost:8000, docs at /docs)
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -e ".[dev]"
cp .env.example .env
uvicorn app.main:app --reload

# Frontend (http://localhost:5173, proxies /api to :8000)
cd frontend
npm install
npm run dev
```

Or run everything in Docker with `docker compose up --build`, then open http://localhost:8080.

## Market data

The data source is pluggable (`backend/app/services/providers/`):

| `STOCKPULSE_PROVIDER` | Behaviour |
|---|---|
| `auto` (default) | Probes Yahoo Finance at startup and uses it if reachable; otherwise falls back to the simulator |
| `yahoo` | Real quotes from Yahoo Finance's public chart API (no key needed; unofficial and rate-limited) |
| `simulated` | Deterministic offline market simulator (GARCH-style volatility); good for dev, demos and tests |

The UI badge shows **LIVE** or **DEMO DATA**, so it is always clear which source is active. To use a paid feed (Polygon, Finnhub, IEX…), implement `MarketDataProvider` (two methods) and register it in `factory.py`.

## The prediction model

`backend/app/ml/`. For each symbol, on demand, cached for 15 minutes:

1. **Features**: 13 technical indicators from 2 years of daily bars: momentum (1d/5d/20d/60d), RSI-14, MACD histogram, distance from the 20- and 50-day averages, the 20/50 trend, Bollinger %B, 20-day volatility, volume vs average (lagged one bar so a partial session can't skew it), and Stochastic %K.
2. **Label**: whether the close 5 trading days later is higher.
3. **Model**: an equal-weight ensemble of standardized logistic regression and gradient-boosted trees.
4. **Honest validation**: 4-fold expanding-window walk-forward validation, with a gap of the label horizon so no future data leaks into training. Accuracy is reported next to a naive "always guess the majority" baseline.
5. **Shrinkage**: the probability is pulled toward 50% unless the model actually beat the baseline out of sample, so a weak model cannot make a confident call.
6. **Explainability**: the top drivers are the logistic-regression contributions to the log-odds.

Score = P(rise) × 100. ≥55 is bullish, ≤45 bearish, anything in between neutral ("mid").

> ⚠️ Short-horizon stock direction is close to a coin flip, and backtest accuracies around 50% are normal and expected. This is an educational project, not financial advice.

## API

| Method | Path | |
|---|---|---|
| GET | `/api/v1/health` | Provider, live/demo flag, last refresh |
| GET | `/api/v1/stocks/top` | Quotes for the top 10 |
| GET | `/api/v1/stocks/search?q=` | Ticker search |
| GET | `/api/v1/stocks/{symbol}/quote` | Latest quote |
| GET | `/api/v1/stocks/{symbol}/history?range=1d\|5d\|1mo\|3mo\|6mo\|1y\|5y` | OHLCV candles |
| GET | `/api/v1/stocks/{symbol}/prediction` | Rise score, signal, confidence, drivers, backtest stats |
| GET | `/api/v1/compare?symbols=AAPL,MSFT&range=6mo` | Performance, risk stats, correlation, predictions |
| WS | `/api/v1/ws/quotes` | Pushes `{type: "snapshot" \| "quotes", data}`. Send `{action: "subscribe" \| "unsubscribe", symbols: [...]}` |

Errors use one shape: `{"error": {"code": "...", "message": "..."}}`.

## Project layout

```
backend/
  app/
    api/routes/       HTTP + WebSocket endpoints
    core/             settings, logging, domain errors
    data/universe.py  supported tickers / top 10
    ml/               features, model, prediction service
    schemas/          Pydantic response models
    services/         market service (quote loop, caching), providers, compare analytics
  tests/              pytest: features, model, providers, API, WebSocket
frontend/
  src/
    components/       UI building blocks (cards, charts, score ring, search…)
    hooks/            TanStack Query hooks, live quote hooks
    lib/              API client, QuoteStream (WebSocket store), formatting, types
    pages/            Dashboard, StockDetail, Compare
```

## Quality checks

```bash
cd backend && ruff check . && ruff format --check . && pytest
cd frontend && npm run lint && npm run typecheck && npm test && npm run build
```

CI runs all of these (`.github/workflows/stockpulse.yml`).
