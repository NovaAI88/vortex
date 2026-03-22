// VORTEX — Market Event Enricher (Phase 1 extended)
//
// Enriches each tick into a ProcessedMarketState.
// Phase 1: reads from featurePipeline.getSnapshot() to attach indicator fields.
// All indicator fields remain null if indicatorsWarm = false.
// Never emits fake values.

import { MarketEvent } from '../../models/MarketEvent';
import { ProcessedMarketState } from '../../models/ProcessedMarketState';
import { getSnapshot } from '../featurePipeline';
import { isNewsRiskActive } from '../newsRiskMonitor';

// Legacy 7-tick rolling average — kept for movingAvg backward compatibility
// when indicators are not yet warm.
const _prices: number[] = [];
const ROLLING_WINDOW = 7;

export function enrichMarketEvent(evt: MarketEvent): ProcessedMarketState {
  // Legacy rolling average
  _prices.push(evt.price);
  if (_prices.length > ROLLING_WINDOW) _prices.shift();
  const rollingAvg = _prices.reduce((a, b) => a + b, 0) / _prices.length;

  const snap = getSnapshot();

  // movingAvg: use EMA20 when warm, fall back to 7-tick rolling avg
  const movingAvg = snap.indicatorsWarm && snap.ema20 !== null
    ? snap.ema20
    : (evt.raw?.movingAvg ? Number(evt.raw.movingAvg) : rollingAvg);

  return {
    // Core
    exchange:  evt.exchange,
    symbol:    evt.symbol,
    eventType: evt.eventType,
    price:     evt.price,
    volume:    evt.volume,
    timestamp: evt.timestamp,
    enriched:  true,
    baseEvent: evt,

    // Legacy (backward compatible)
    movingAvg,

    // Phase 1: indicator snapshot (null until warm)
    indicatorsWarm: snap.indicatorsWarm,
    candleTs:       snap.timestamp || null,
    candleClose:    snap.lastClose ?? null,

    ema20:  snap.ema20  ?? null,
    ema50:  snap.ema50  ?? null,
    ema200: snap.ema200 ?? null,
    atr14:  snap.atr14  ?? null,
    rsi14:  snap.rsi14  ?? null,
    adx14:  snap.adx14  ?? null,

    volatilityLevel: snap.volatilityLevel ?? null,
    newsRiskFlag:    isNewsRiskActive(),
  };
}
