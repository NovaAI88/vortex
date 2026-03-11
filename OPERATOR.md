# AETHER OPERATOR CHEATSHEET

## System Start & Paper Trading (MVP)

- Build & run:
  docker compose up --build

- Run backend paper trading validation:
  cd backend && npm test -- tests/integration/paperTradingValidation.test.ts
  (subject to npm availability in environment)

- Start/preview frontend (local dev):
  cd frontend && npm install && npm start

- Reset system:
  Stop all services, clear in-memory backend state, restart containers

## Stage 12: Stabilization — Must-Do Now (MVP)

- Remove unused test/demo/source files
- Ensure all directories have clear, updated README.md and usage notes
- Fix any lint/format errors and ensure `.gitignore` is exhaustive
- Complete/finalize run, validation, and operator documentation (this file)
- Add/update "Known Limitations" in top-level README and docs (see below)
- Verify all system tests/validation that can run in the current environment
- Ensure all architectural and boundary docs are up to date (no feature churn)
- Verify no live trading logic, no real API/exchange connections, no secrets/credentials

## Stage 12: Nice-to-Have (Defer if blocking MVP)

- Add system/service health probes to Dockerfile/compose, and/or backend status endpoint
- Add or expand formal CI/CD pipeline definitions (e.g., GitHub Actions)
- Enable auto-lint/format enforcement if not already present
- Switch/stabilize from in-memory state to persistent portfolio/position backend
- Integrate system soak/endurance test with operator notification on failure/unstable state
- Harden error handling and operator-facing logging for production

## Known Limitations (as of MVP freeze)

- **Test environment limitation:** Automated test runs (`npm test`) may not be available (npm not present) in the current system; manual, CI, or alternate runtime may be needed.
- **Portfolio/Position state is in-memory only:** On restart, all position and portfolio state is lost. No historical persistence in MVP.
- **Validation outputs are backend/test-only:** Paper trading validation results are not surfaced in the frontend UI.
- **No live trading:** All execution flows are through mock adapters only; no connection or path to production exchanges is present.
- **Manual operator start/stop:** Full automated orchestrator (for cascade restart, interval reset, CI triggers, etc.) is not in place.
- **No advanced reconciliation or gap-handling:** ExecutionResult ingestion and snapshotting are optimistic and may miss edge-case state transitions on restart or message loss
- **Docs may not reflect every hotfix:** Minor structure, method, or config changes may occasionally outpace documentation until MVP handover.
