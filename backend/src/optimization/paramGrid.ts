// VORTEX — Param Grid (Phase 6)
//
// Defines all sweep dimensions and generates param combinations.
//
// Two sweep modes:
//
//   'one-at-a-time' (default)
//     Varies each dimension independently, holding all others at their default.
//     N dimensions × V values = N×V combinations. Fast, interpretable.
//     Best for identifying which individual parameters matter most.
//
//   'cross'
//     Full cross-product of all dimensions.
//     V1 × V2 × ... × Vn combinations. Can be large — hard-capped at maxCombos.
//     Best for identifying interaction effects between top parameters.
//
// Both modes always include the default param set as combination index 0.

import { ParamSet, SweepDimension, SweepMode, DEFAULT_PARAMS, OptimizationConfig } from './optimizationTypes';

// ─── Standard sweep dimensions ─────────────────────────────────────────────
// These are the default dimensions used when no custom dimensions are provided.

export const STANDARD_DIMENSIONS: SweepDimension[] = [
  // ── Exit / ATR multipliers ─────────────────────────────────────────────
  {
    name:   'atrMultiplierTrend',
    values: [1.0, 1.2, 1.5, 1.8, 2.0],
    apply:  (base, v) => ({
      ...base,
      id: `${base.id}|atrT=${v}`,
      exit: { ...base.exit, atrMultiplierTrend: v },
    }),
  },
  {
    name:   'atrMultiplierRange',
    values: [0.7, 1.0, 1.2, 1.5],
    apply:  (base, v) => ({
      ...base,
      id: `${base.id}|atrR=${v}`,
      exit: { ...base.exit, atrMultiplierRange: v },
    }),
  },
  {
    name:   'tp1PartialPct',
    values: [0.30, 0.40, 0.50, 0.60, 0.70],
    apply:  (base, v) => ({
      ...base,
      id: `${base.id}|tp1pct=${v}`,
      exit: { ...base.exit, tp1PartialPct: v },
    }),
  },

  // ── Trend strategy ─────────────────────────────────────────────────────
  {
    name:   'adxMin',
    values: [20, 22, 25, 28, 30],
    apply:  (base, v) => ({
      ...base,
      id: `${base.id}|adxMin=${v}`,
      trend: { ...base.trend, adxMin: v },
    }),
  },
  {
    name:   'pullbackMin',
    values: [0.002, 0.003, 0.005, 0.008],
    apply:  (base, v) => ({
      ...base,
      id: `${base.id}|pbMin=${v}`,
      trend: { ...base.trend, pullbackMin: v },
    }),
  },
  {
    name:   'pullbackMax',
    values: [0.015, 0.020, 0.025, 0.030],
    apply:  (base, v) => ({
      ...base,
      id: `${base.id}|pbMax=${v}`,
      trend: { ...base.trend, pullbackMax: v },
    }),
  },
  {
    name:   'rsiLongMax',
    values: [65, 70, 75, 80],
    apply:  (base, v) => ({
      ...base,
      id: `${base.id}|rsiLMax=${v}`,
      trend: { ...base.trend, rsiLongMax: v },
    }),
  },

  // ── Range strategy ─────────────────────────────────────────────────────
  {
    name:   'rsiOversold',
    values: [25, 30, 35, 40],
    apply:  (base, v) => ({
      ...base,
      id: `${base.id}|rsiOS=${v}`,
      range: { ...base.range, rsiOversold: v },
    }),
  },
  {
    name:   'rsiOverbought',
    values: [60, 65, 70, 75],
    apply:  (base, v) => ({
      ...base,
      id: `${base.id}|rsiOB=${v}`,
      range: { ...base.range, rsiOverbought: v },
    }),
  },
  {
    name:   'breakoutMargin',
    values: [0.005, 0.010, 0.015, 0.020],
    apply:  (base, v) => ({
      ...base,
      id: `${base.id}|bkout=${v}`,
      range: { ...base.range, breakoutMargin: v },
    }),
  },

  // ── Confidence filter ──────────────────────────────────────────────────
  {
    name:   'minConfidence',
    values: [0, 0.3, 0.4, 0.5, 0.6],
    apply:  (base, v) => ({
      ...base,
      id: `${base.id}|conf=${v}`,
      confidence: { minConfidence: v },
    }),
  },
];

// ─── Public API ────────────────────────────────────────────────────────────

/**
 * Generate all parameter combinations for the given config.
 * Always starts with the default set (index 0).
 * Deduplicates by param set id. Caps at maxCombos.
 */
export function generateParamGrid(config: OptimizationConfig): ParamSet[] {
  const dimensions = config.dimensions.length > 0
    ? config.dimensions
    : STANDARD_DIMENSIONS;

  const combos: ParamSet[] = [{ ...DEFAULT_PARAMS, id: 'default' }];
  const seen = new Set<string>(['default']);

  if (config.sweepMode === 'cross') {
    generateCross(dimensions, DEFAULT_PARAMS, config.maxCombos, combos, seen);
  } else {
    generateOneAtATime(dimensions, DEFAULT_PARAMS, config.maxCombos, combos, seen);
  }

  return combos.slice(0, config.maxCombos);
}

// ─── Internal generators ───────────────────────────────────────────────────

function generateOneAtATime(
  dims:     SweepDimension[],
  base:     ParamSet,
  maxCombos: number,
  out:      ParamSet[],
  seen:     Set<string>,
): void {
  for (const dim of dims) {
    for (const value of dim.values) {
      if (out.length >= maxCombos) return;
      const candidate = dim.apply(base, value);
      if (!seen.has(candidate.id)) {
        seen.add(candidate.id);
        out.push(candidate);
      }
    }
  }
}

function generateCross(
  dims:      SweepDimension[],
  base:      ParamSet,
  maxCombos: number,
  out:       ParamSet[],
  seen:      Set<string>,
): void {
  // Build cartesian product recursively, depth-first, with early termination
  function recurse(dimIdx: number, current: ParamSet): void {
    if (out.length >= maxCombos) return;

    if (dimIdx === dims.length) {
      if (!seen.has(current.id)) {
        seen.add(current.id);
        out.push(current);
      }
      return;
    }

    const dim = dims[dimIdx];
    for (const value of dim.values) {
      if (out.length >= maxCombos) return;
      recurse(dimIdx + 1, dim.apply(current, value));
    }
  }

  recurse(0, { ...base, id: 'cross' });
}

/**
 * Find all "neighbor" param sets for a given set within a result array.
 * A neighbor is a param set that differs in exactly one dimension by ±1 step.
 * Used for stability analysis.
 */
export function findNeighbors(
  target:  ParamSet,
  allSets: ParamSet[],
  dims:    SweepDimension[],
): ParamSet[] {
  return allSets.filter(candidate => {
    if (candidate.id === target.id) return false;
    // Count how many dimensions differ
    let diffCount = 0;
    for (const dim of dims) {
      // Apply dim at each value; check if it produces either target or candidate
      const targetVal  = extractDimValue(dim, target);
      const candidateVal = extractDimValue(dim, candidate);
      if (targetVal !== candidateVal) diffCount++;
    }
    return diffCount === 1;
  });
}

// Extract the numeric value a dimension has in a given param set
// by probing: apply dim at each value, see which one produces equivalent sub-fields
function extractDimValue(dim: SweepDimension, ps: ParamSet): number | null {
  for (const v of dim.values) {
    const probed = dim.apply({ ...DEFAULT_PARAMS, id: '_probe' }, v);
    // Compare the fields that this dimension changes
    if (paramSetsEquivalentOnDim(probed, ps, dim)) return v;
  }
  return null;
}

// Two param sets are "equivalent on this dimension" if applying the dim at value v
// to DEFAULT_PARAMS produces a ParamSet where the changed fields match the candidate
function paramSetsEquivalentOnDim(probed: ParamSet, candidate: ParamSet, _dim: SweepDimension): boolean {
  // Compare all mutable fields
  return (
    probed.exit.atrMultiplierTrend    === candidate.exit.atrMultiplierTrend    &&
    probed.exit.atrMultiplierRange    === candidate.exit.atrMultiplierRange    &&
    probed.exit.tp1PartialPct         === candidate.exit.tp1PartialPct         &&
    probed.exit.fallbackStopPct       === candidate.exit.fallbackStopPct       &&
    probed.trend.adxMin               === candidate.trend.adxMin               &&
    probed.trend.pullbackMin          === candidate.trend.pullbackMin           &&
    probed.trend.pullbackMax          === candidate.trend.pullbackMax           &&
    probed.trend.rsiLongMax           === candidate.trend.rsiLongMax           &&
    probed.trend.rsiShortMin          === candidate.trend.rsiShortMin          &&
    probed.range.rsiOversold          === candidate.range.rsiOversold          &&
    probed.range.rsiOverbought        === candidate.range.rsiOverbought        &&
    probed.range.breakoutMargin       === candidate.range.breakoutMargin       &&
    probed.confidence.minConfidence   === candidate.confidence.minConfidence
  );
}
