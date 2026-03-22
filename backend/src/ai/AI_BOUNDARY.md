# VORTEX — AI Layer Boundary Contract

**Last updated:** 2026-03-22

---

## What the AI Layer May Do

The AI layer (signals, strategy selection, parameter adjustment) is permitted to:

- **Generate trade signals** — publish to `EVENT_TOPICS.TRADE_SIGNAL` via the intelligence pipeline
- **Assist strategy selection** — rank or weight strategies via `strategyWeightEngine`
- **Adjust strategy parameters** — modify signal thresholds and weights within defined bounds
- **Provide analysis output** — publish enriched market state for UI consumption

---

## What the AI Layer Must NEVER Do

The AI layer must NOT:

- Call `setEngineMode()` or any function in `executionMode.ts`
- Call `startTrading()`, `pauseTrading()`, or any function in `operatorState.ts`
- Call `resetRiskState()` or any function in `globalRiskController.ts`
- Publish directly to `EVENT_TOPICS.DECISION_CANDIDATE` — that is the decision pipeline's job
- Publish directly to `EVENT_TOPICS.RISK_DECISION` — that is the risk pipeline's job
- Bypass the signal → decision → risk → execution pipeline sequence

---

## Pipeline Flow (Enforced)

```
AI/Intelligence Layer
       ↓
  TRADE_SIGNAL (event)
       ↓
  Decision Pipeline  ← evaluates signal, applies strategy logic
       ↓
  DECISION_CANDIDATE (event)
       ↓
  Risk Pipeline  ← checks all risk limits, kill switch, exposure caps
       ↓
  RISK_DECISION (event, approved=true only)
       ↓
  Execution Pipeline  ← sizes position, routes to mock or live adapter
       ↓
  EXECUTION_RESULT (event)
       ↓
  Portfolio Ledger
```

Each stage is deterministic and rule-based. The AI layer only touches the top of this chain.

---

## Execution Environment

| Mode | AI Can Trigger? | Notes |
|------|----------------|-------|
| PAPER_TRADING | Indirectly — via signal only | All trades are simulated |
| LIVE_TRADING | No — gated by env flag | Not implemented; requires explicit deployment decision |
| OFF | No | Pipeline drops all requests |

---

## Enforcement

This contract is enforced structurally:
- Execution functions are not exported from intelligence modules
- AI router (`ai/router/`) has no import path to execution or risk modules
- Any PR adding such an import must be explicitly reviewed and justified

---

## Summary

> The AI generates signals. Humans and deterministic rules decide what happens to them.
