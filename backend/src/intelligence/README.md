# Intelligence Layer

Responsibilities:
- Subscribe to ProcessedMarketState
- Run deterministic, minimal signal generation only
- Publish advisory TradeSignal (never orders/execution/risk)
- Orchestration via intelligencePipeline.ts only
- Produce structured, inspectable AI research reports via `aiResearchPipeline.ts`
  from `AI_ANALYSIS + PROCESSING_STATE`, persisted to disk for restart safety

Prohibited:
- No advanced analytics, ML, persistence, order/risk/execution, or strategy logic
- No direct decision/risk/execution output; only advisory outputs (`TradeSignal`, `AIResearchReport`)
