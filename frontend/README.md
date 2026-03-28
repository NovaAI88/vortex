# VORTEX Frontend (Operator Dashboard)

## Usage
- Start: `npm install && npm start`
- Shows operator dashboard with system/position/portfolio state from backend API endpoints
- Only consumes API endpoints (no domain logic in frontend)

## Known Limitations
- Requires backend to provide API endpoints on same host/port in dev
- No paper trading validation surfaced in frontend UI (backend/test only)
- Component-level tests require npm/Node.js availability to run, as documented in OPERATOR.md and root README.md
- No live trading; all data is for simulated (paper) runs only
