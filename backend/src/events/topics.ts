// All canonical event bus topics for VORTEX
export const EVENT_TOPICS = {
  MARKET_EVENT: 'market.event',
  PROCESSING_STATE: 'processing.state',
  INTELLIGENCE_SIGNAL: 'intelligence.signal',
  DECISION_CANDIDATE: 'decision.candidate',
  ORDER_REQUEST: 'order.request',
  RISK_DECISION: 'risk.decision',
  EXECUTION_RESULT: 'execution.result',
  POSITION_SNAPSHOT: 'position.snapshot',
  PORTFOLIO_SNAPSHOT: 'portfolio.snapshot',
  // V2: position monitor emits this when it auto-closes a position (SL/TP hit)
  POSITION_MONITOR_CLOSE: 'position.monitor.close',
  // V2: circuit breaker emits this when consecutive-loss threshold is reached
  CIRCUIT_BREAKER_TRIGGERED: 'circuit.breaker.triggered',
  // Phase 1: candle close events from candle aggregator
  CANDLE_CLOSE_1M: 'candle.close.1m',
  CANDLE_CLOSE_5M: 'candle.close.5m',
  CANDLE_CLOSE_15M: 'candle.close.15m',
  // Phase 2: AI regime analysis output (read-only, advisory)
  AI_ANALYSIS: 'ai.analysis',
  // V2: structured AI research output (read-only, inspectable)
  AI_RESEARCH: 'ai.research',
};
