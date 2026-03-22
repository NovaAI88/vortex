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
};
