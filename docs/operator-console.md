# V4 Operator Console

The Operator Console is the single operator-facing oversight surface for VORTEX runtime state.

## Route

- Frontend: `/operator`
- Backend aggregate API: `GET /api/system/status`

## Scope of Visibility

The console is intentionally bounded to operational controls and trust signals:

- Runtime/system health (`systemHealth`, `tradingAllowed`, engine mode)
- Operator controls (`start`, `pause`, `reset risk`, `override risk`, `clear override`)
- Decision safety (`activeBlockReason`, circuit-breaker progression, kill switch)
- AI insight state (`aiAnalysis`, `aiResearch`)
- Portfolio and monitor status (`equity`, open positions, monitor state)
- Recent alerts and risk flags

## Control Constraints

Controls invoke existing backend safety APIs only:

- `POST /api/operator/start`
- `POST /api/operator/pause`
- `POST /api/risk/reset`
- `POST /api/operator/override-risk`
- `POST /api/operator/override-risk/clear`

No control in this console bypasses V1 verification, V2 research output, or V3 decision/risk gates.

## Failure Behavior

- If `GET /api/system/status` fails, the page shows a disconnected state.
- Control action errors are rendered inline and do not mutate local state optimistically.
- Status refresh is poll-based (5s), so operator state is inspectable and converges after each action.
