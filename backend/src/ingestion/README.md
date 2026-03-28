# Ingestion Layer

VORTEX's ingestion layer provides:
- Live Binance connector (`binanceConnector`): via wss://stream.binance.com:9443/ws/btcusdt@trade, adapts to canonical MarketEvent using `binanceAdapter`.
- Mock connector (`mockConnector`): for local/testing, generates random trades as MarketEvent.

All connectors use adapters and publishers to inject canonical MarketEvents into the event bus. Downstream contracts remain unchanged.

Switch between live and mock via `startIngestion(bus, useLive)` in code or config.
