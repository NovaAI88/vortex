# Processing Layer

Responsibilities:
- Subscribes to validated MarketEvent via event bus
- Validates and normalizes input
- Performs minimal enrichment (e.g., copying field, basic subjective metric)
- Publishes ProcessedMarketState as output (no downstream logic here)

Strictly prohibited:
- No intelligence, strategy, signal, risk, or execution logic
- No direct calls to other domains, only event bus