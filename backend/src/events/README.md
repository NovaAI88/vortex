# Events

This folder defines event bus types, interfaces, envelopes, and topic constants for the VORTEX Pub/Sub event bus.

Guidelines:
- Use only for message transport, never business/strategy logic
- All published events must use EventEnvelope<T>
- Observers may subscribe read-only to any topic, but cannot publish or modify
- Topics are centrally enumerated in topics.ts
