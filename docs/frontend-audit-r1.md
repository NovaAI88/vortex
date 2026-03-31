# VORTEX R1 Frontend Audit + Real-Data Wiring Map

Date: 2026-03-31  
Scope: `NOV-13` (R1 audit + wiring only)

## Route And Menu Classification

| Surface | Route | Backend Data Sources | Classification | Notes |
|---|---|---|---|---|
| Dashboard | `/` | `/api/status`, `/api/portfolio`, `/api/operator/state`, `/api/risk` | Fully real-data connected | Renamed visible title from AETHER to VORTEX. |
| Market Terminal | `/market` | `/api/status`, `/api/orderbook`, `/api/trades`, `/api/decisions`, `/api/runtime/state` | Fully real-data connected | Live orderbook/trade/decision feed already wired. |
| AI Analysis | `/ai` | `/api/status`, `/api/runtime/state`, `/api/signals`, `/api/decisions`, `/api/risk`, `/api/pipeline/trace` | Partially connected | Real telemetry wired; some fields still naturally empty when backend payload omits optional fields (`variantId`, rationale details). |
| News Intelligence | `/news` | `/api/status`, `/api/signals`, `/api/ai/research` | Partially connected | Wired in R1 to real AI research endpoint; no dedicated `/api/news` feed exists yet. |
| Sentiment | `/sentiment` | `/api/status`, `/api/signals`, `/api/trades` | Fully real-data connected | Derived from live signal/trade streams. |
| Technical Analysis | `/ta` | `/api/status`, `/api/orderbook`, `/api/trades` | Fully real-data connected | Reads backend microstructure directly. |
| Narrative Edge | `/narrative` | `/api/status`, `/api/signals`, `/api/decisions`, `/api/ai/analysis` | Partially connected | Wired in R1 to real AI analysis endpoint; no dedicated `/api/narrative` endpoint exists. |
| Portfolio | `/portfolio` | `/api/status`, `/api/operator/state`, `/api/portfolio`, `/api/risk`, `/api/runtime/state`, manual control endpoints | Partially connected | Core data is real; some optional table fields still display not-wired when backend omits them. |
| Alerts | `/alerts` | `/api/status`, `/api/risk`, `/api/risk/status`, `/api/portfolio`, `POST /api/risk/reset` | Fully real-data connected | Live risk controls and feed are wired. |
| Strategy Intelligence | `/strategy` | `/api/status`, `/api/runtime/state`, `/api/strategies/performance`, `/api/strategies/weights` | Fully real-data connected | Uses strategy endpoints directly. |
| Status | `/status` | `/api/status`, `/api/engine/status`, `/api/engine/risk`, `/api/alerts`, `/api/operator/state`, `/api/runtime/state`, `/api/pipeline/trace` | Fully real-data connected | Multi-source runtime truth surface. |
| Operator Console | `/operator` | `/api/system/status`, operator/risk control endpoints | Fully real-data connected | Aggregated control plane endpoint is wired. |
| Backtest | `/backtest` | `/api/backtest/run`, `/api/backtest/status`, `/api/backtest/results` | Fully real-data connected | Uses backend backtest API only. |
| Legacy Redirect | `/strategies` -> `/strategy` | N/A | Legacy route (kept) | Safe compatibility redirect. |

## Remaining Stale/Legacy Surfaces

- Visible branding remnants of AETHER in shell were present before R1 (`BrandHeader`, `Sidebar`, dashboard title). These were renamed to VORTEX in this phase.
- `CommandPaletteStub` remains visible in layout footer area and is still a stub (truthful but legacy).
- `PositionPage` exists but has no active route/menu entry; this is an orphaned legacy page candidate for merge/removal in a later phase.
- Asset filenames still contain `aether-*`; this is internal file naming debt, not active route/data wiring debt.

## R1 Wiring Changes Applied

- News Intelligence now reads `GET /api/ai/research` and displays real report summary, interpretation, action, and risk flags.
- Narrative Edge now reads `GET /api/ai/analysis` and displays real regime/bias/confidence/volatility/rationale payload.
- Added API client contracts for `/api/ai/research` and `/api/ai/analysis`.
