// VORTEX — Trailing Stop State Registry (Phase 4)
//
// In-memory registry of active trailing stops, keyed by positionKey.
// Cleared on restart (positions re-derive trailing state from ledger tp1Hit flag).
//
// INVARIANT: trailPrice is monotonic.
//   - LONG:  trailPrice may only increase (ratchet up). Never decreases.
//   - SHORT: trailPrice may only decrease (ratchet down). Never increases.
//
// This invariant is enforced in advanceTrail(). Any caller that attempts to
// loosen a trail will be silently ignored.

export interface TrailingStop {
  positionKey:  string;
  side:         'long' | 'short';
  trailPrice:   number;  // current stop level — monotonic in favorable direction
  peakPrice:    number;  // most favorable price seen since trail activated
  entryR:       number;  // R-multiple (stop distance) used for trail calculation
  activatedAt:  string;  // ISO timestamp of activation
}

// ─── State ───────────────────────────────────────────────────────────────────

const registry = new Map<string, TrailingStop>();

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Activate a trailing stop for a position.
 * Initial trailPrice = breakeven (avgEntry) — protects principal after TP1.
 */
export function activateTrail(
  positionKey: string,
  side:        'long' | 'short',
  avgEntry:    number,
  entryR:      number,
): void {
  if (registry.has(positionKey)) return; // already active — do not override

  registry.set(positionKey, {
    positionKey,
    side,
    trailPrice:  avgEntry,  // start at breakeven
    peakPrice:   avgEntry,  // peak starts at entry
    entryR,
    activatedAt: new Date().toISOString(),
  });
}

/**
 * Advance the trail if current price has moved favorably beyond the peak.
 * Trail is calculated as: peakPrice ∓ (entryR × TRAIL_MULTIPLIER)
 *
 * MONOTONIC GUARANTEE:
 *   For LONG:  new trailPrice must be > existing trailPrice. If it would be lower (due to
 *              ATR spike or any other reason), the advance is discarded.
 *   For SHORT: new trailPrice must be < existing trailPrice. Same guarantee.
 *
 * Returns the updated TrailingStop, or null if positionKey not found.
 */
const TRAIL_MULTIPLIER = 0.75; // trail is 0.75× the entry stop distance

export function advanceTrail(
  positionKey:   string,
  currentPrice:  number,
): TrailingStop | null {
  const trail = registry.get(positionKey);
  if (!trail) return null;

  const { side, peakPrice, trailPrice, entryR } = trail;
  const trailDistance = entryR * TRAIL_MULTIPLIER;

  if (side === 'long') {
    if (currentPrice > peakPrice) {
      const candidate = Number((currentPrice - trailDistance).toFixed(2));
      // MONOTONIC: only advance if candidate is above current trail
      if (candidate > trailPrice) {
        trail.peakPrice  = currentPrice;
        trail.trailPrice = candidate;
      }
    }
  } else {
    // short
    if (currentPrice < peakPrice) {
      const candidate = Number((currentPrice + trailDistance).toFixed(2));
      // MONOTONIC: only advance if candidate is below current trail
      if (candidate < trailPrice) {
        trail.peakPrice  = currentPrice;
        trail.trailPrice = candidate;
      }
    }
  }

  return trail;
}

/**
 * Check if current price has breached the trailing stop.
 * Returns true if the position should be closed.
 */
export function isTrailBreached(
  positionKey:  string,
  currentPrice: number,
): boolean {
  const trail = registry.get(positionKey);
  if (!trail) return false;

  if (trail.side === 'long')  return currentPrice <= trail.trailPrice;
  if (trail.side === 'short') return currentPrice >= trail.trailPrice;
  return false;
}

/**
 * Get the current trailing stop for a position, or null if not active.
 */
export function getTrail(positionKey: string): TrailingStop | null {
  return registry.get(positionKey) ?? null;
}

/**
 * Remove a trailing stop (called when position is fully closed).
 */
export function removeTrail(positionKey: string): void {
  registry.delete(positionKey);
}

/**
 * List all active trailing stops (for API/monitoring).
 */
export function getAllTrails(): TrailingStop[] {
  return Array.from(registry.values());
}
