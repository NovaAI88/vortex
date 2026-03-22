// VORTEX — High-Risk Strategy (Phase 3)
//
// Explicit no-trade strategy for HIGH_RISK regime.
// Always returns null — no signal emitted.
// Existence as a named module enforces intentional design: HIGH_RISK is a
// handled case, not a missing branch.
//
// AI boundary: read-only. No imports from execution, risk, operator, portfolio.

import { ProcessedMarketState } from '../../models/ProcessedMarketState';
import { TradeSignal } from '../../models/TradeSignal';
import { AIAnalysis } from '../aiAnalysisEngine';
import { logger } from '../../utils/logger';

export function generateHighRiskSignal(
  state: ProcessedMarketState,
  analysis: AIAnalysis,
): TradeSignal | null {
  logger.debug('highRiskStrategy', 'HIGH_RISK regime — no signal emitted', {
    symbol: state.symbol,
    regime: analysis.regime,
    rationale: analysis.rationale,
  });
  return null;
}
