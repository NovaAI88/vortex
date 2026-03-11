# Ingestion Layer

AETHER's ingestion layer is strictly input-only. Its responsibilities are:
- Receive raw payloads (connectors/)
- Normalize to canonical MarketEvent (adapters/)
- Wrap in EventEnvelope and publish to event bus (publishers/)

No business, strategy, or output-side logic allowed. Each source must pass through all three sublayers before entering Processing.