// VORTEX — Mock Exchange Adapter
//
// Simulates execution for paper trading. No real orders are placed.
//
// SLIPPAGE MODEL:
// Paper trading without slippage produces unrealistically optimistic results.
// This adapter applies a simple market-impact slippage model:
//
//   - Base slippage: VORTEX_MOCK_SLIPPAGE_BPS env var (default: 5 bps = 0.05%)
//   - Size impact: larger positions incur proportionally more slippage
//   - Direction: buys fill higher, sells fill lower (realistic adverse fill)
//   - The slippage is applied to the fill price, not reported as a fee
//
// This is intentionally conservative — real slippage in crypto can be higher.

import { ExecutionRequest } from '../../models/ExecutionRequest';
import { ExecutionResult } from '../../models/ExecutionResult';

// Base slippage in basis points (1 bps = 0.01%). Default: 5 bps.
const BASE_SLIPPAGE_BPS = Math.max(
  0,
  Number(process.env.VORTEX_MOCK_SLIPPAGE_BPS ?? 5)
);

// Size impact multiplier: each unit of qty adds this many extra bps.
// Default: 0 (disabled) — set VORTEX_MOCK_SIZE_IMPACT_BPS_PER_QTY to enable.
const SIZE_IMPACT_BPS_PER_QTY = Math.max(
  0,
  Number(process.env.VORTEX_MOCK_SIZE_IMPACT_BPS_PER_QTY ?? 0)
);

function computeFillPrice(requestPrice: number, side: 'buy' | 'sell', qty: number): {
  fillPrice: number;
  slippageBps: number;
} {
  const totalSlippageBps = BASE_SLIPPAGE_BPS + SIZE_IMPACT_BPS_PER_QTY * (qty || 0);
  const slippageFraction = totalSlippageBps / 10_000;

  // Buys fill higher (adverse), sells fill lower (adverse)
  const direction = side === 'buy' ? 1 : -1;
  const fillPrice = requestPrice * (1 + direction * slippageFraction);

  return {
    fillPrice: Number(fillPrice.toFixed(8)),
    slippageBps: Number(totalSlippageBps.toFixed(4)),
  };
}

export function mockExchangeAdapter(request: ExecutionRequest): ExecutionResult {
  const requestPrice = request.price ?? 0;
  const qty = request.qty ?? 0;

  const { fillPrice, slippageBps } = computeFillPrice(requestPrice, request.side, qty);

  return {
    id: (Math.random() * 1e17).toString(36),
    executionRequestId: request.id,
    riskDecisionId: request.riskDecisionId,
    actionCandidateId: request.actionCandidateId,
    signalId: request.signalId,
    strategyId: request.strategyId,
    symbol: request.symbol,
    side: request.side,
    price: fillPrice,              // fill price after slippage (not the request price)
    qty: qty,
    variantId: request.variantId,
    stopLoss: request.stopLoss,
    takeProfit: request.takeProfit,
    status: 'simulated',
    reason: `Simulated fill at ${fillPrice} (slippage: ${slippageBps} bps, requested: ${requestPrice})`,
    adapter: 'mockExchangeAdapter',
    timestamp: new Date().toISOString(),
  };
}
