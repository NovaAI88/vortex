# VORTEX Backend

## Key Endpoints
- /api/status: Returns system status/health
- /api/ping: Liveness check
- /api/position: Current PositionSnapshot
- /api/portfolio: Current PortfolioSnapshot

## Run/Validation
- To run backend tests: `npm test` (if runtime is available)
- To run full pipeline paper trading validation: `npm test -- tests/integration/paperTradingValidation.test.ts`
- Automated tests may not work if npm dependencies or environment tools are missing -- confirm with OPERATOR.md and Known Limitations in root README.md.

## Known Limitations
- In-memory position/portfolio only (state lost on restart)
- Test/validation automation runtime not always available
- No live execution; all orders/events are simulated
