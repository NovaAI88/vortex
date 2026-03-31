# Performance Module

## Profitability Loop (V5)

- `profitabilityLoop.ts` builds a bounded profitability snapshot from:
  - portfolio realized outcomes (`portfolioLedger`)
  - signal quality outcomes (`signalOutcomeTracker`)
  - risk safety state (`globalRiskController`)
  - validation report (`backtestValidator`)
  - latest AI research attribution (`aiResearchPipeline`)
- `profitabilityLoopStore.ts` persists snapshot history to `data/profitability-loop-state.json` (or `PROFITABILITY_LOOP_STATE_FILE`).
- `signalOutcomeTracker.ts` now persists active/completed signal outcomes to `data/signal-outcome-state.json` (or `SIGNAL_OUTCOME_STATE_FILE`) so evidence survives restarts.

## API Surfaces

- `GET /api/performance/profitability-loop`:
  - computes latest snapshot
  - persists to profitability history
  - returns snapshot + persistence metadata
- `GET /api/performance/profitability-loop/history?limit=N`:
  - returns newest-first persisted snapshots
- `GET /api/performance/signal-tracks`:
  - returns active/completed tracks + signal tracker persistence path
