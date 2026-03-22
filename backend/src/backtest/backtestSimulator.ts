// VORTEX — Backtest Simulator (Phase 5)
//
// Drives signal generation + exit simulation over a ProcessedMarketState replay series.
// Reuses the real Phase 2–4 stack directly (pure functions, no event bus dependency).
//
// ── Exit simulation rules ──────────────────────────────────────────────────
//
// IMPORTANT: Breach checks use candle high AND low, not just close.
// This accurately reflects intra-candle price movement:
//   - For a LONG position:
//       stop-loss breached if candleLow  <= stopLoss
//       TP1 hit         if candleHigh >= tp1
//       trailing breach if candleHigh >= tp2 (activates trailing) then
//                          candleLow  <= trailingStop (breaches it)
//   - For a SHORT position (mirror):
//       stop-loss breached if candleHigh >= stopLoss
//       TP1 hit         if candleLow  <= tp1
//       trailing breach if candleLow  <= tp2 (activates) then
//                          candleHigh >= trailingStop (breaches)
//
// Within a single candle, priority order: stopLoss → tp1 → trailing breach.
// (Conservative: assume worst-case ordering where stop fires before TP.)
//
// ── Trade lifecycle ────────────────────────────────────────────────────────
//
//   Entry (on signal):
//     1. Compute exit levels via computeExitLevels()
//     2. Open position; record entry
//
//   Each subsequent candle:
//     3. Check hard stop → if breached: full close, record trade
//     4. If TP1 not yet hit: check TP1 → if hit: 50% partial close
//     5. If TP1 hit and trailing not activated: check TP2 → if candle exceeds
//        tp2, activate trailing stop at breakeven (entry price)
//     6. If trailing active: ratchet trailing stop upward (long) / downward (short)
//        to max favourable price seen; check trailing breach → close remainder
//
//   End of data:
//     7. Any open position closes at last candle close (exitReason = 'endOfData')
//
// ── One position at a time ─────────────────────────────────────────────────
// No re-entry until previous trade fully closed (both halves).

import { ProcessedMarketState } from '../models/ProcessedMarketState';
import { analyzeMarket }         from '../intelligence/aiAnalysisEngine';
import { generateTrendSignal }   from '../intelligence/strategies/trendStrategy';
import { generateRangeSignal }   from '../intelligence/strategies/rangeStrategy';
import { generateHighRiskSignal } from '../intelligence/strategies/highRiskStrategy';
import { computeExitLevels }     from '../execution/exitCalculator';
import { BacktestConfig, BacktestTrade, ExitReason } from './backtestTypes';
import { ParamSet, DEFAULT_PARAMS } from '../optimization/optimizationTypes';
import { TrendSignalParams } from '../intelligence/strategies/trendStrategy';
import { RangeSignalParams, RangeRouterContext }  from '../intelligence/strategies/rangeStrategy';
import { ExitLevelParams }    from '../execution/exitCalculator';
import { ReplayExtensionMap } from './historicalFeatureBuilder';

// ─── Internal position state ───────────────────────────────────────────────

interface OpenPosition {
  entryIndex:      number;
  entryTime:       string;
  entryPrice:      number;
  side:            'buy' | 'sell';
  positionSize:    number;   // USD notional
  qty:             number;   // asset units

  stopLoss:        number;
  tp1:             number;
  tp2:             number;
  rMultiple:       number;
  exitSource:      'atr' | 'fallback';

  tp1Hit:          boolean;
  tp1PnL:          number;
  trailingActive:  boolean;
  trailingStop:    number;
  bestPrice:       number;   // highest high (long) / lowest low (short) seen since TP2

  regime:          string;
  strategyId:      string;
  variantId:       string;

  // Phase 7A: entry-quality snapshot (captured at entry, carried to buildTrade)
  regimeAge:               number | null;
  regimeConfidenceAtEntry: number | null;
  ema20SlopeAtEntry:       number | null;
  atrNormDistAtEntry:      number | null;
  rangeLocationAtEntry:    number | null;
}

// ─── Public API ────────────────────────────────────────────────────────────

export interface SimulatorResult {
  trades:      BacktestTrade[];
  equityCurve: number[];       // equity value at each candle index
}

export function runSimulation(
  states:      ProcessedMarketState[],
  config:      BacktestConfig,
  params?:     ParamSet,
  extensions?: ReplayExtensionMap,  // Phase 7A: optional diagnostic extensions
): SimulatorResult {
  const trades:      BacktestTrade[] = [];
  const equityCurve: number[]        = [];

  let equity       = config.initialCapital;
  let position: OpenPosition | null = null;

  // Resolve param overrides (optimizer path only; live path uses DEFAULT_PARAMS)
  const p = params ?? DEFAULT_PARAMS;

  // Phase 7A: regime tracking
  let currentRegime:      string | null = null;
  let regimeStartIndex:   number        = 0;

  const trendParams: TrendSignalParams = {
    adxMin:                    p.trend.adxMin,
    pullbackMin:               p.trend.pullbackMin,
    pullbackMax:               p.trend.pullbackMax,
    rsiLongMax:                p.trend.rsiLongMax,
    rsiShortMin:               p.trend.rsiShortMin,
    pullbackDirectionTolerance: p.trend.pullbackDirectionTolerance, // Phase 7B
    allowStackInferredBias:    p.trend.allowStackInferredBias,      // Phase 7B
  };

  const rangeParams: RangeSignalParams = {
    rsiOversold:             p.range.rsiOversold,
    rsiOverbought:           p.range.rsiOverbought,
    breakoutMargin:          p.range.breakoutMargin,
    maxRegimeAge:            p.range.maxRegimeAge,            // Phase 7B: undefined = gate off
    rangeLocationThreshold:  p.range.rangeLocationThreshold,  // Phase 7B: undefined = gate off
  };

  const exitParams: ExitLevelParams = {
    atrMultiplierTrend:    p.exit.atrMultiplierTrend,
    atrMultiplierRange:    p.exit.atrMultiplierRange,
    atrMultiplierHighRisk: p.exit.atrMultiplierHighRisk,
    fallbackStopPct:       p.exit.fallbackStopPct,
  };

  const minConfidence = p.confidence.minConfidence;

  for (let i = 0; i < states.length; i++) {
    const state = states[i];

    // ── Step 1: check open position against this candle ──────────────────
    if (position !== null) {
      const result = checkExits(position, state, i, equity, p.exit.tp1PartialPct);

      if (result !== null) {
        // Trade fully or partially closed
        equity += result.equityDelta;
        trades.push(result.trade);
        position = result.remainingPosition;
      }
    }

    // ── Step 2: if no open position, try to generate a signal ─────────────
    if (position === null && state.indicatorsWarm) {
      const snap = stateToFeatureSnapshot(state);
      const analysis = analyzeMarket(snap, state.price, state.newsRiskFlag ?? false);

      // Phase 7A: track regime age (candles elapsed in current regime)
      if (analysis.regime !== currentRegime) {
        currentRegime    = analysis.regime;
        regimeStartIndex = i;
      }
      const regimeAge = i - regimeStartIndex;

      if (analysis.regime === 'HIGH_RISK') {
        // No trade
      } else if (analysis.confidence < minConfidence) {
        // Filtered by confidence threshold
      } else {
        let signal = null;
        if (analysis.regime === 'TREND') {
          signal = generateTrendSignal(state, analysis, trendParams);
        } else if (analysis.regime === 'RANGE') {
          // Build RangeRouterContext from backtest's own regime tracker + extension map.
          // This mirrors what the live router does, keeping strategy calls identical.
          const ext = extensions?.get(i) ?? null;
          let rangeLocation: number | null = null;
          if (ext !== null && ext.recentHigh20 !== null && ext.recentLow20 !== null && ext.recentHigh20 > ext.recentLow20) {
            rangeLocation = Number(
              ((state.price - ext.recentLow20) / (ext.recentHigh20 - ext.recentLow20)).toFixed(4)
            );
          }
          const rangeCtx: RangeRouterContext = { regimeAge, rangeLocation };
          signal = generateRangeSignal(state, analysis, rangeParams, rangeCtx);
        } else {
          signal = generateHighRiskSignal(state, analysis);
        }

        if (signal && (signal.signalType === 'buy' || signal.signalType === 'sell')) {
          const side = signal.signalType as 'buy' | 'sell';

          // Use exitMode from config — if 'fixed', pass null ATR to force fallback
          const atr14ForExit = config.exitMode === 'fixed' ? null : state.atr14;
          const exits = computeExitLevels(state.price, side, atr14ForExit, analysis.regime, exitParams);

          const positionSize = equity * config.positionSizePct;
          const qty          = positionSize / state.price;

          // ── Phase 7A: capture entry-quality fields ─────────────────────
          const ext = extensions?.get(i) ?? null;

          // ATR-normalized distance from EMA20 at entry
          const distFromEma20 = state.ema20 !== null
            ? Math.abs(state.price - state.ema20) / state.price
            : null;
          const atrNormDistAtEntry = (distFromEma20 !== null && state.atr14 !== null && state.atr14 > 0)
            ? Number((distFromEma20 / (state.atr14 / state.price)).toFixed(4))
            : null;

          // Range location: (price - recentLow) / (recentHigh - recentLow)
          // Only meaningful for RANGE trades; null for TREND
          let rangeLocationAtEntry: number | null = null;
          if (analysis.regime === 'RANGE' && ext !== null) {
            const { recentHigh20, recentLow20 } = ext;
            if (recentHigh20 !== null && recentLow20 !== null && recentHigh20 > recentLow20) {
              rangeLocationAtEntry = Number(
                ((state.price - recentLow20) / (recentHigh20 - recentLow20)).toFixed(4)
              );
            }
          }

          position = {
            entryIndex:     i,
            entryTime:      state.timestamp,
            entryPrice:     state.price,
            side,
            positionSize,
            qty,

            stopLoss:       exits.stopLoss,
            tp1:            exits.tp1,
            tp2:            exits.tp2,
            rMultiple:      exits.rMultiple,
            exitSource:     exits.source,

            tp1Hit:         false,
            tp1PnL:         0,
            trailingActive: false,
            trailingStop:   exits.stopLoss, // will be moved to breakeven on TP2 hit
            bestPrice:      state.price,

            regime:         analysis.regime,
            strategyId:     signal.strategyId,
            variantId:      signal.variantId ?? '',

            // Phase 7A entry-quality fields
            regimeAge,
            regimeConfidenceAtEntry: analysis.regimeConfidence,
            ema20SlopeAtEntry:       ext?.ema20Slope ?? null,
            atrNormDistAtEntry,
            rangeLocationAtEntry,
          };
        }
      }
    }

    // Record equity at this candle (mark-to-market if position open)
    const markEquity = position
      ? equity + unrealizedPnL(position, state.price)
      : equity;
    equityCurve.push(Number(markEquity.toFixed(2)));
  }

  // ── End of data: close any remaining position ─────────────────────────
  if (position !== null && states.length > 0) {
    const lastState = states[states.length - 1];
    const closePrice = lastState.price;
    const pnl = computeTradePnL(position, closePrice, true);
    equity += pnl.total;

    trades.push(buildTrade(
      position,
      states.length - 1,
      lastState.timestamp,
      closePrice,
      'endOfData',
      pnl,
    ));
    equityCurve[equityCurve.length - 1] = Number(equity.toFixed(2));
  }

  return { trades, equityCurve };
}

// ─── Exit checking ─────────────────────────────────────────────────────────

interface ExitResult {
  trade:             BacktestTrade;
  equityDelta:       number;
  remainingPosition: OpenPosition | null;
}

function checkExits(
  pos:           OpenPosition,
  state:         ProcessedMarketState,
  index:         number,
  equity:        number,
  tp1PartialPct: number = 0.5,
): ExitResult | null {
  const high = state.candleHigh ?? state.price;
  const low  = state.candleLow  ?? state.price;
  const isLong = pos.side === 'buy';

  // ── 1. Hard stop-loss (highest priority) ─────────────────────────────
  const stopBreached = isLong
    ? low  <= pos.stopLoss
    : high >= pos.stopLoss;

  if (stopBreached) {
    const exitPrice = pos.stopLoss;
    const pnl = computeTradePnL(pos, exitPrice, true);
    return {
      trade: buildTrade(pos, index, state.timestamp, exitPrice, 'stopLoss', pnl),
      equityDelta: pnl.total,
      remainingPosition: null,
    };
  }

  // ── 2. TP1 hit (50% partial close) ───────────────────────────────────
  if (!pos.tp1Hit) {
    const tp1Breached = isLong
      ? high >= pos.tp1
      : low  <= pos.tp1;

    if (tp1Breached) {
      // Partial close: tp1PartialPct of position
      const partialQty  = pos.qty * tp1PartialPct;
      const partialSize = pos.positionSize * tp1PartialPct;
      const tp1ExitPrice = pos.tp1;

      const tp1PnL = isLong
        ? (tp1ExitPrice - pos.entryPrice) * partialQty
        : (pos.entryPrice - tp1ExitPrice) * partialQty;

      // Update position: halve size, mark tp1 as hit, activate breakeven trail
      pos.tp1Hit        = true;
      pos.tp1PnL        = tp1PnL;
      pos.qty           = pos.qty - partialQty;       // remainder
      pos.positionSize  = pos.positionSize - partialSize;
      pos.trailingStop  = pos.entryPrice;  // move stop to breakeven
      pos.trailingActive = false;          // trailing activates on TP2 reach
    }
  }

  // ── 3. TP2 / trailing stop activation ────────────────────────────────
  if (pos.tp1Hit) {
    // Check TP2 activation
    if (!pos.trailingActive) {
      const tp2Reached = isLong
        ? high >= pos.tp2
        : low  <= pos.tp2;

      if (tp2Reached) {
        pos.trailingActive = true;
        pos.bestPrice      = isLong ? high : low;
        // Ratchet trailing stop to lock in some profit
        pos.trailingStop   = isLong
          ? pos.bestPrice - pos.rMultiple          // 1R behind best price
          : pos.bestPrice + pos.rMultiple;
      }
    }

    // Ratchet trailing stop if already active
    if (pos.trailingActive) {
      if (isLong && high > pos.bestPrice) {
        pos.bestPrice    = high;
        const newTrail   = pos.bestPrice - pos.rMultiple;
        if (newTrail > pos.trailingStop) pos.trailingStop = newTrail;
      } else if (!isLong && low < pos.bestPrice) {
        pos.bestPrice    = low;
        const newTrail   = pos.bestPrice + pos.rMultiple;
        if (newTrail < pos.trailingStop) pos.trailingStop = newTrail;
      }

      // Check trailing stop breach
      const trailBreached = isLong
        ? low  <= pos.trailingStop
        : high >= pos.trailingStop;

      if (trailBreached) {
        const exitPrice = pos.trailingStop;
        const pnl = computeTradePnL(pos, exitPrice, false);
        return {
          trade: buildTrade(pos, index, state.timestamp, exitPrice, 'trailing', pnl),
          equityDelta: pnl.total,
          remainingPosition: null,
        };
      }
    }

    // Check breakeven stop (active after TP1 even before TP2)
    if (!pos.trailingActive) {
      const beBreached = isLong
        ? low  <= pos.trailingStop
        : high >= pos.trailingStop;

      if (beBreached) {
        const exitPrice = pos.trailingStop;
        const pnl = computeTradePnL(pos, exitPrice, false);
        return {
          trade: buildTrade(pos, index, state.timestamp, exitPrice, 'trailing', pnl),
          equityDelta: pnl.total,
          remainingPosition: null,
        };
      }
    }
  }

  return null;
}

// ─── PnL calculation ───────────────────────────────────────────────────────

interface TradePnL {
  total:       number;
  pnlPct:      number;
  realizedR:   number;
  tp1PnL:      number;
  remainderPnL: number;
}

function computeTradePnL(
  pos:        OpenPosition,
  exitPrice:  number,
  isFullClose: boolean,
): TradePnL {
  const isLong = pos.side === 'buy';

  const remainderPnL = isLong
    ? (exitPrice - pos.entryPrice) * pos.qty
    : (pos.entryPrice - exitPrice) * pos.qty;

  const total = pos.tp1PnL + remainderPnL;

  // PnL as % of full original position size (before any partial close)
  // pos.positionSize at this point is the REMAINING size after tp1 partial close
  // buildTrade will expose the original full size via the trade record
  const pnlPct = pos.positionSize > 0 ? (total / pos.positionSize) * 100 : 0;

  // R-multiples: total PnL divided by original R (stop distance × remaining qty)
  const rUSD = pos.rMultiple * pos.qty;
  const realizedR   = rUSD > 0 ? total / rUSD : 0;

  return {
    total:       Number(total.toFixed(6)),
    pnlPct:      Number(pnlPct.toFixed(4)),
    realizedR:   Number(realizedR.toFixed(4)),
    tp1PnL:      Number(pos.tp1PnL.toFixed(6)),
    remainderPnL: Number(remainderPnL.toFixed(6)),
  };
}

function unrealizedPnL(pos: OpenPosition, markPrice: number): number {
  const isLong = pos.side === 'buy';
  const mtm    = isLong
    ? (markPrice - pos.entryPrice) * pos.qty
    : (pos.entryPrice - markPrice) * pos.qty;
  return pos.tp1PnL + mtm;
}

// ─── Trade builder ─────────────────────────────────────────────────────────

function buildTrade(
  pos:        OpenPosition,
  exitIndex:  number,
  exitTime:   string,
  exitPrice:  number,
  exitReason: ExitReason,
  pnl:        TradePnL,
): BacktestTrade {
  return {
    entryIndex:   pos.entryIndex,
    entryTime:    pos.entryTime,
    entryPrice:   pos.entryPrice,
    side:         pos.side,
    positionSize: pos.positionSize,
    qty:          pos.qty,

    stopLoss:     pos.stopLoss,
    tp1:          pos.tp1,
    tp2:          pos.tp2,
    rMultiple:    pos.rMultiple,
    exitSource:   pos.exitSource,

    exitIndex,
    exitTime,
    exitPrice,
    exitReason,

    pnl:          pnl.total,
    pnlPct:       pnl.pnlPct,
    realizedR:    pnl.realizedR,
    isWin:        pnl.total > 0,

    regime:       pos.regime,
    strategyId:   pos.strategyId,
    variantId:    pos.variantId,

    tp1Hit:       pos.tp1Hit,
    tp1PnL:       pnl.tp1PnL,
    remainderPnL: pnl.remainderPnL,

    // Phase 7A: entry-quality fields
    regimeAge:               pos.regimeAge,
    regimeConfidenceAtEntry: pos.regimeConfidenceAtEntry,
    ema20SlopeAtEntry:       pos.ema20SlopeAtEntry,
    atrNormDistAtEntry:      pos.atrNormDistAtEntry,
    rangeLocationAtEntry:    pos.rangeLocationAtEntry,
    quickStop:               null, // filled by entryQualityAnalyzer post-simulation
  };
}

// ─── Feature snapshot bridge ───────────────────────────────────────────────
// Converts ProcessedMarketState into the FeatureSnapshot shape that analyzeMarket() expects.

function stateToFeatureSnapshot(state: ProcessedMarketState) {
  return {
    timestamp:       state.timestamp,
    candleCount:     0,                       // not used by analyzeMarket()
    indicatorsWarm:  state.indicatorsWarm ?? false,
    ema20:           state.ema20  ?? null,
    ema50:           state.ema50  ?? null,
    ema200:          state.ema200 ?? null,
    atr14:           state.atr14  ?? null,
    rsi14:           state.rsi14  ?? null,
    adx14:           state.adx14  ?? null,
    plusDI:          null,
    minusDI:         null,
    volatilityLevel: state.volatilityLevel ?? null,
    lastClose:       state.price,
  };
}
