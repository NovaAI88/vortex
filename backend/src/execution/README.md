# Execution Layer

Responsibilities:
- Subscribes to approved RiskDecision events (risk.decision)
- Only executes on first approval of each unique decision (deduplication)
- Creates ExecutionRequest, passes to mockExchangeAdapter
- Publishes ExecutionResult (operational outcome) to execution.result topic

Strictly prohibited:
- No trading or risk policy logic
- No real exchange logic, persistence, or portfolio state
- No feedback calls into risk, decision, or intelligence layers
- Fully event-driven, boundaries enforced
