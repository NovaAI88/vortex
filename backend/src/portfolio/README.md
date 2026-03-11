# Portfolio / Position State Layer

Responsibilities:
- Maintain in-memory, event-driven single-threaded portfolio/position state
- Process each unique ExecutionResult for state update
- Emit PositionSnapshot and PortfolioSnapshot (with full event lineage)
- Block duplicate event processing (by ExecutionResult.id)

Strictly prohibited:
- No PnL, position accounting, or advanced balance logic
- No reconciliation or live state fetches
- No cross-layer coupling (no direct strategy, risk, or execution)
- No persistence (prototype only, addresses restart loss later)
