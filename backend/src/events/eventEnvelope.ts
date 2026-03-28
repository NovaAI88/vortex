// Canonical event envelope for all VORTEX events
export interface EventEnvelope<T> {
  id: string;
  topic: string;
  timestamp: string; // ISO8601
  producer: string;
  version: string;
  correlationId?: string;
  payload: T;
}
