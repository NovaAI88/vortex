# AETHER Paper Trading Validation

## How to Run

1. Ensure backend test suite is available.
2. Run: `npm test -- tests/integration/paperTradingValidation.test.ts`
   or with convenience script: `./scripts/run_paper_trading_validation.sh`

## What it Does

- Injects a fixed deterministic event stream (see test) through the full AETHER pipeline: Ingestion → Processing → Intelligence → Decision → Risk → Execution → Portfolio
- Validates correct propagation, duplication guards, and event lineage at every architectural boundary
- Verifies event emissions for PositionSnapshot, PortfolioSnapshot, ExecutionResult as expected

## Interpretation

- Look for PASSED output on all asserts
- Failures indicate drift, pipeline breakage, or new requirements

## Constraints

- No live execution or external state change
- No layer boundary changes, test injects input only and observes event output
- No frontend or UI exposure in this validation stage
