# VORTEX Frontend (Operator Dashboard)

## Usage
- Start: `npm install && npm start`
- Shows operator dashboard with system/position/portfolio state from backend API endpoints
- Only consumes API endpoints (no domain logic in frontend)

## Local backend connection
- Default frontend API target: `http://localhost:3000`
- Override with `REACT_APP_API_BASE=http://your-host:port`
- Frontend and backend do not use a dev proxy; the backend must allow the frontend origin via CORS

## Live View Runbook
1. Start backend: `cd /Users/nicholasgeorge/workspace/company/vortex/backend && npm run dev`
2. Start frontend: `cd /Users/nicholasgeorge/workspace/company/vortex/frontend && npm start`
3. Open the frontend and verify live wiring:
   - Market terminal cards/source state is backend-driven
   - Backtest page fetches `/api/backtest/results` and renders backend `result` payload

## Known Limitations
- `ChartPanel.tsx` will show fallback price history if backend has no live market prices yet
- No paper trading validation surfaced in frontend UI (backend/test only)
- Component-level tests require npm/Node.js availability to run, as documented in OPERATOR.md and root README.md
- No live trading; all data is for simulated (paper) runs only
