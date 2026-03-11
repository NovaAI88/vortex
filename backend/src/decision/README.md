# Decision Layer

Responsibilities:
- Subscribe to TradeSignal (event bus, intelligence.signal)
- Apply minimal deterministic rules (basicSignalEvaluator) to create ActionCandidate intent
- Publish ActionCandidate to event bus (decision.candidate)
- Orchestration via decisionPipeline.ts only

Strictly prohibited:
- No risk, execution, order, or portfolio logic
- No ML, no advanced/strategy logic
- No direct output to risk/execution layers (must only use bus)
- ActionCandidate = intent only (not an order or trade!)
