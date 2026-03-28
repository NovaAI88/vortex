# VORTEX

VORTEX is a modular trading intelligence and automation platform. See `OPERATOR.md` for full run instructions and MVP operator requirements.

## Final Known Limitations (MVP)

- Test environment is not guaranteed: npm may not be available on all host systems. Run tests where possible/CI.
- All portfolio/position state is in-memory only; state is lost on backend/container restart.
- No live execution, all trading is simulated (paper trading only).
- Paper trading validation is backend-only, no frontend UI for validation results is present.
- Some CI/formatting/nit scripts may not run if dependencies are missing. Check OPERATOR.md for required versions.

## Usage (see OPERATOR.md for additional details)

- Start system: `docker compose up --build`
- Manual backend test/validation: `cd backend && npm test [-- specific.test.ts]`
- Manual frontend preview: `cd frontend && npm install && npm start`

## Docs
- See /docs/*, /backend/README.md, /frontend/README.md for architecture, API, and pipeline specifics.
