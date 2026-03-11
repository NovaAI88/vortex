# Intelligence Layer

Responsibilities:
- Subscribe to ProcessedMarketState
- Run deterministic, minimal signal generation only
- Publish advisory TradeSignal (never orders/execution/risk)
- Orchestration via intelligencePipeline.ts only

Prohibited:
- No advanced analytics, ML, persistence, order/risk/execution, or strategy logic
- No output except TradeSignal