# VORTEX System Architecture

## Introduction

VORTEX is designed as a modular, layered platform for real-time trading intelligence and execution. Its architecture follows clear boundaries between ingestion, processing, AI, decision, risk, and presentation to prevent chaotic development and ensure long-term maintainability.

## Layered Architecture Overview

**1. Ingestion Layer**
- Role: Reliable, timestamped collection of all external data (market feeds, news, sentiment).
- Constraint: Strictly input-only; does not process or enrich data.

**2. Processing Layer**
- Role: Aggregates, normalizes, and enriches data for downstream use; performs event/basic anomaly detection.
- Constraint: Never generates signals or trading logic.

**3. Intelligence Layer**
- Role: Applies AI/ML models and analytics to output candidate trade signals and forecasts.
- Constraint: Cannot make decisions or execute orders.

**4. Decision Layer**
- Role: Evaluates and selects trade signals for possible action via strategies and rule logic.
- Constraint: All outputs are candidates; cannot bypass Risk layer.

**5. Risk & Execution Layer**
- Role: Enforces risk rules, can veto any order, manages all outgoing executions to exchanges.
- Constraint: Only layer allowed to approve and forward actual trades. All audit logging handled here.

**6. Application/Backend Layer**
- Role: Routes requests between modules, exposes public/internal APIs, manages session/state/control, but contains NO business domain logic.
- Constraint: Orchestration and interface only; no trading, AI, or risk logic.

**7. Presentation/Frontend Layer**
- Role: UI/dashboard, reporting, visualization, operator input.
- Constraint: No core logic beyond UI state management.

## Data Flow Overview

1. External data enters via Ingestion.
2. Processing normalizes and enriches data.
3. Intelligence generates signals and analytics.
4. Decision logic evaluates signals, applies strategies.
5. Risk/Execution validates and (if safe) executes orders.
6. Backend orchestrates service interaction and exposes operator/system APIs.
7. Frontend presents system status and allows user interaction via backend.

## Backend/Application Layer: Clarified Role

- The backend is the central “traffic controller”—routing requests, managing API exposure, and enforcing authentication.
- It delegates all business logic to domain layers, never implementing domain rules/decisions.
- Changes to trading, signal, or risk logic must be made in their respective dedicated layers.

## External Integrations

- All data and execution integrations (crypto exchanges, newsfeeds, sentiment APIs) are managed by Ingestion (for data) or Execution (for orders).
- Backend never talks directly to external market APIs except when passing through approved requests.

## Service Communication Model

- Modules interact *only* through explicitly approved service boundaries and stable data contracts.
- No module may bypass its intermediate domain responsibilities.
- Internal: REST and WebSocket APIs for operator/system interaction; message queues/pub-sub recommended for scalable data/event propagation between layers.
- External: Dedicated connectors for exchanges; market data via secured WebSockets/REST.
- No layer directly calls a lower or higher layer except via these boundaries.

## Live Execution Safeguard

- **Policy:** No live trading or external order submission will be enabled until (a) paper-trading mode is fully validated, and (b) all risk/audit flow has been approved and tested.
