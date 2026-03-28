# VORTEX Module Map

## Introduction

Enforcing explicit module boundaries and single-responsibility design, this map defines the permitted responsibilities of each layer and module.

## Layer-by-Layer Module Table

| Layer                   | Module Examples           | Core Responsibilities                           | Excluded Responsibilities                |
|-------------------------|--------------------------|------------------------------------------------|------------------------------------------|
| Presentation/Frontend   | Dashboard, AlertUI       | Display, input, notification, visualization     | Business/domain logic, data processing   |
| Application/Backend     | API, Auth, Orchestrator  | Route, session/user mgmt, system API, logs      | Trading logic, risk, AI, execution       |
| Risk & Execution        | OrderManager, RiskEngine | Risk checks, trade veto, order submission/log   | Signal/decision generation, user auth    |
| Decision                | StrategyEngine, Selector | Strategy impl, select/route ActionCandidates    | Risk approval, market execution          |
| Intelligence            | SignalGen, MLRunner      | Signal scoring/forecasting, analytics           | Decision/strategy, order execution       |
| Processing              | DataEnricher, EventAggr  | Clean/aggregate/enrich/forward data/events      | Signal, trade, or risk logic             |
| Ingestion               | FeedHandler, NewsBridge  | Collect and timestamp all external data         | Enrichment, analysis, trade generation   |

## Module Responsibilities (By Layer)
- **Ingestion:**  
  - All duties end at delivery of raw data to Processing
- **Processing:**  
  - Delivers only normalized/enriched data, never signals/trading
- **Intelligence (AI):**  
  - Delivers candidate signals (never orders or execution requests)
- **Decision:**  
  - Transforms signals to ActionCandidates, applies strategies—cannot directly interact with Execution
- **Risk/Execution:**  
  - Can veto or approve any order, executes only what is allowed, never generates signals
- **Backend:**  
  - Only orchestrates and exposes approved interfaces
- **Frontend:**  
  - Purely visual; all state comes from backend

## Dependency Map

**Domain Data/Control Flow:**
Ingestion → Processing → Intelligence → Decision → Risk/Execution

**Application Access Flow:**
Frontend ↔ Backend/API ↔ Domain Services

- Pure data/decision/control *always* follow the chain: Ingestion → ... → Risk/Execution
- Operator or external users interact through Frontend and Backend.
- No domain service may bypass an adjacent layer or backchannel data.

## Critical Path and Extensibility

- Each module interfaces only via stable contracts upstream/downstream
- Swappable modules (e.g., new AI model) require no changes outside direct dependencies

## Interface Contract Examples
- MarketEvent, TradeSignal, ActionCandidate, OrderRequest, etc. (see build-sequence.md for canonical contracts)
