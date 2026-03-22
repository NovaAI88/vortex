// VORTEX — ATR-Based Exit Calculator (Phase 4)
//
// Pure deterministic function. No side effects. No external imports.
//
// Computes stop-loss, TP1 (1.5R partial), and TP2 (2R trailing target)
// from live ATR14 and regime context.
//
// ATR multipliers are regime-aware:
//   TREND     → 1.5× (trend needs room to breathe)
//   RANGE     → 1.0× (tighter — smaller expected swings)
//   HIGH_RISK → 1.2× (shouldn't enter, but belt+braces if called)
//   unknown   → 1.0× (safe default)
//
// Stop floor:   max(atr_stop, price × 0.002)  ← never tighter than 0.2%
// Stop ceiling: price × 0.05                  ← never wider than 5%
//
// Fallback (when ATR not available or not warm):
//   stopLoss   = price ± (price × 0.005)      ← existing 0.5% behavior preserved
//   tp1        = price ∓ (price × 0.0075)     ← 1.5× stop distance
//   tp2        = price ∓ (price × 0.010)      ← 2× stop distance

export type Regime = 'TREND' | 'RANGE' | 'HIGH_RISK';

export interface ExitLevels {
  stopLoss:        number;   // hard stop — full close if breached
  tp1:             number;   // partial close target (1.5R) — 50% qty close
  tp2:             number;   // trailing stop activation target (2R)
  rMultiple:       number;   // stop distance in $ (R unit)
  atrUsed:         number;   // ATR14 value used (0 = fallback mode)
  multiplierUsed:  number;   // regime multiplier applied
  source:          'atr' | 'fallback';
}

// ─── Constants ───────────────────────────────────────────────────────────────

const STOP_FLOOR_PCT   = 0.002;  // 0.2% minimum stop distance
const STOP_CEILING_PCT = 0.050;  // 5.0% maximum stop distance
const FALLBACK_STOP_PCT = 0.005; // 0.5% fixed stop when ATR unavailable

const ATR_MULTIPLIERS: Record<string, number> = {
  TREND:     1.5,
  RANGE:     1.0,
  HIGH_RISK: 1.2,
};

// ─── Optional param overrides (optimizer only) ───────────────────────────────
// Live pipeline never passes this argument. Defaults to module constants.

export interface ExitLevelParams {
  atrMultiplierTrend?:    number;  // default 1.5
  atrMultiplierRange?:    number;  // default 1.0
  atrMultiplierHighRisk?: number;  // default 1.2
  tp1PartialPct?:         number;  // not used by this function directly; stored for simulator
  fallbackStopPct?:       number;  // default 0.005
}

// ─── Public API ──────────────────────────────────────────────────────────────

export function computeExitLevels(
  price:    number,
  side:     'buy' | 'sell',
  atr14:    number | null | undefined,
  regime:   string | null | undefined,
  params?:  ExitLevelParams,
): ExitLevels {
  const isLong = side === 'buy';

  // Resolve multipliers — params override defaults; live path never provides params
  const resolvedMultipliers: Record<string, number> = {
    TREND:     params?.atrMultiplierTrend    ?? ATR_MULTIPLIERS.TREND,
    RANGE:     params?.atrMultiplierRange    ?? ATR_MULTIPLIERS.RANGE,
    HIGH_RISK: params?.atrMultiplierHighRisk ?? ATR_MULTIPLIERS.HIGH_RISK,
  };
  const resolvedFallbackPct = params?.fallbackStopPct ?? FALLBACK_STOP_PCT;

  // ── ATR path ────────────────────────────────────────────────────────────
  if (atr14 !== null && atr14 !== undefined && Number.isFinite(atr14) && atr14 > 0) {
    const multiplier = resolvedMultipliers[regime ?? ''] ?? 1.0;
    const rawStop = atr14 * multiplier;

    // Clamp stop distance to floor/ceiling
    const floor   = price * STOP_FLOOR_PCT;
    const ceiling = price * STOP_CEILING_PCT;
    const R = Math.max(floor, Math.min(ceiling, rawStop));

    const stopLoss = isLong
      ? Number((price - R).toFixed(2))
      : Number((price + R).toFixed(2));

    const tp1 = isLong
      ? Number((price + R * 1.5).toFixed(2))
      : Number((price - R * 1.5).toFixed(2));

    const tp2 = isLong
      ? Number((price + R * 2.0).toFixed(2))
      : Number((price - R * 2.0).toFixed(2));

    return {
      stopLoss,
      tp1,
      tp2,
      rMultiple:      Number(R.toFixed(2)),
      atrUsed:        atr14,
      multiplierUsed: multiplier,
      source:         'atr',
    };
  }

  // ── Fallback path (no ATR available) ────────────────────────────────────
  const R = price * resolvedFallbackPct;

  const stopLoss = isLong
    ? Number((price - R).toFixed(2))
    : Number((price + R).toFixed(2));

  const tp1 = isLong
    ? Number((price + R * 1.5).toFixed(2))
    : Number((price - R * 1.5).toFixed(2));

  const tp2 = isLong
    ? Number((price + R * 2.0).toFixed(2))
    : Number((price - R * 2.0).toFixed(2));

  return {
    stopLoss,
    tp1,
    tp2,
    rMultiple:      Number(R.toFixed(2)),
    atrUsed:        0,
    multiplierUsed: 0,
    source:         'fallback',
  };
}
