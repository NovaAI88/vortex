import { getLastResearch } from '../intelligence/aiResearchPipeline';
import { getPortfolio } from '../portfolio/state/portfolioLedger';
import { getStatus } from '../risk/globalRiskController';
import { generateValidationReport } from '../validation/backtestValidator';
import { getCompletedSignalTracks, getSignalMetrics } from './signalOutcomeTracker';

export interface ProfitabilityLoopWarning {
  section: 'profitability' | 'safety' | 'verification' | 'research';
  message: string;
}

export interface ProfitabilityLoopSnapshot {
  generatedAt: string;
  profitability: {
    equity: number;
    realizedPnl: number;
    returnPct: number;
    resolvedTradeCount: number;
    winRate: number | null;
    profitFactor: number | null;
  };
  signalQuality: {
    tracked: number;
    active: number;
    completed: number;
    successRate: number;
    failureRate: number;
    timeoutRate: number;
    avgMfePct: number;
    avgMaePct: number;
  };
  safety: {
    tradingAllowed: boolean;
    killSwitch: boolean;
    activeBlockReason: string | null;
    drawdownPercent: number;
    dailyLossPercent: number;
    riskOverrideActive: boolean;
  };
  verification: {
    flag: string;
    summary: string;
    liveTrades: number;
    backtestTrades: number;
    hasEnoughLiveData: boolean;
    tradeFrequencyFlag: string;
  };
  research: {
    available: boolean;
    generatedAt: string | null;
    regime: string | null;
    bias: string | null;
    confidence: number | null;
    fallbackReason: string | null;
  };
  tuningFocus: string[];
  warnings: ProfitabilityLoopWarning[];
}

type PortfolioProvider = typeof getPortfolio;
type SignalMetricsProvider = typeof getSignalMetrics;
type CompletedSignalsProvider = typeof getCompletedSignalTracks;
type RiskStatusProvider = typeof getStatus;
type ValidationProvider = typeof generateValidationReport;
type ResearchProvider = typeof getLastResearch;

export interface ProfitabilityLoopDependencies {
  getPortfolio?: PortfolioProvider;
  getSignalMetrics?: SignalMetricsProvider;
  getCompletedSignalTracks?: CompletedSignalsProvider;
  getStatus?: RiskStatusProvider;
  generateValidationReport?: ValidationProvider;
  getLastResearch?: ResearchProvider;
}

function asFinite(value: unknown, fallback = 0): number {
  return Number.isFinite(value) ? Number(value) : fallback;
}

function toRate(numerator: number, denominator: number): number {
  if (denominator <= 0) return 0;
  return Number((numerator / denominator).toFixed(6));
}

function toPct(value: number): number {
  return Number((value * 100).toFixed(4));
}

function buildTradeStats(rawTrades: any[]): {
  resolvedTradeCount: number;
  wins: number;
  losses: number;
  winRate: number | null;
  profitFactor: number | null;
} {
  const realized = rawTrades.filter(t => Number.isFinite(t?.realizedPnL)).map(t => Number(t.realizedPnL));
  const wins = realized.filter(p => p > 0);
  const losses = realized.filter(p => p < 0);
  const grossProfit = wins.reduce((sum, x) => sum + x, 0);
  const grossLoss = Math.abs(losses.reduce((sum, x) => sum + x, 0));
  const resolvedTradeCount = realized.length;

  return {
    resolvedTradeCount,
    wins: wins.length,
    losses: losses.length,
    winRate: resolvedTradeCount > 0 ? toRate(wins.length, resolvedTradeCount) : null,
    profitFactor: grossLoss > 0 ? Number((grossProfit / grossLoss).toFixed(6)) : null,
  };
}

function buildTuningFocus(snapshot: ProfitabilityLoopSnapshot): string[] {
  const focus: string[] = [];

  if (!snapshot.safety.tradingAllowed) {
    focus.push(`Resolve active safety block: ${snapshot.safety.activeBlockReason ?? 'unknown'}.`);
  }

  if (snapshot.signalQuality.completed < 20) {
    focus.push('Increase resolved signal sample size to at least 20 before strategy retuning.');
  }

  if (snapshot.signalQuality.completed >= 20 && snapshot.signalQuality.successRate < 0.45) {
    focus.push('Signal success rate is below 45%; tighten signal gates or reduce noisy entries.');
  }

  if (snapshot.profitability.resolvedTradeCount >= 10 && snapshot.profitability.profitFactor !== null && snapshot.profitability.profitFactor < 1) {
    focus.push('Profit factor is below 1.0; prioritize loss containment and exit quality.');
  }

  if (snapshot.verification.flag === 'UNDERPERFORMING' || snapshot.verification.flag === 'OVERFIT_RISK') {
    focus.push('Investigate live-vs-backtest mismatch before increasing exposure.');
  }

  if (!snapshot.research.available) {
    focus.push('AI research attribution is unavailable; restore analysis feed before tuning.');
  }

  if (focus.length === 0) {
    focus.push('No immediate red flags detected; continue monitoring and iterate one parameter set at a time.');
  }

  return focus;
}

export function buildProfitabilityLoopSnapshot(
  dependencies: ProfitabilityLoopDependencies = {},
): ProfitabilityLoopSnapshot {
  const warnings: ProfitabilityLoopWarning[] = [];
  const now = new Date().toISOString();

  const readPortfolio = dependencies.getPortfolio ?? getPortfolio;
  const readSignalMetrics = dependencies.getSignalMetrics ?? getSignalMetrics;
  const readCompletedSignals = dependencies.getCompletedSignalTracks ?? getCompletedSignalTracks;
  const readRiskStatus = dependencies.getStatus ?? getStatus;
  const readValidation = dependencies.generateValidationReport ?? generateValidationReport;
  const readResearch = dependencies.getLastResearch ?? getLastResearch;

  let portfolio = {
    equity: 10000,
    pnl: 0,
    trades: [] as any[],
  };
  try {
    const p = readPortfolio();
    portfolio = {
      equity: asFinite((p as any)?.equity, 10000),
      pnl: asFinite((p as any)?.pnl, 0),
      trades: Array.isArray((p as any)?.trades) ? (p as any).trades : [],
    };
  } catch (err: any) {
    warnings.push({
      section: 'profitability',
      message: `Portfolio read failed: ${String(err?.message ?? err)}`,
    });
  }

  let signalMetrics = {
    totals: { tracked: 0, active: 0, completed: 0, success: 0, failure: 0, timeout: 0 },
    rates: { successRate: 0, failureRate: 0, timeoutRate: 0 },
    excursions: { avgMfePct: 0, avgMaePct: 0 },
  };
  try {
    signalMetrics = readSignalMetrics();
  } catch (err: any) {
    warnings.push({
      section: 'profitability',
      message: `Signal metrics read failed: ${String(err?.message ?? err)}`,
    });
  }

  let completedSignalCount = 0;
  try {
    completedSignalCount = readCompletedSignals().length;
  } catch (err: any) {
    warnings.push({
      section: 'profitability',
      message: `Completed signal read failed: ${String(err?.message ?? err)}`,
    });
  }

  let risk = {
    tradingAllowed: true,
    killSwitch: false,
    activeBlockReason: null as string | null,
    drawdownPercent: 0,
    dailyLossPercent: 0,
    riskOverrideActive: false,
  };
  try {
    const status = readRiskStatus();
    risk = {
      tradingAllowed: Boolean((status as any)?.tradingAllowed),
      killSwitch: Boolean((status as any)?.killSwitch),
      activeBlockReason: typeof (status as any)?.activeBlockReason === 'string' ? (status as any).activeBlockReason : null,
      drawdownPercent: asFinite((status as any)?.drawdownPercent, 0),
      dailyLossPercent: asFinite((status as any)?.dailyLossPercent, 0),
      riskOverrideActive: Boolean((status as any)?.riskOverrideActive),
    };
  } catch (err: any) {
    warnings.push({
      section: 'safety',
      message: `Risk status read failed: ${String(err?.message ?? err)}`,
    });
  }

  let verification = {
    flag: 'UNKNOWN',
    summary: 'Validation unavailable',
    liveTrades: 0,
    backtestTrades: 0,
    hasEnoughLiveData: false,
    tradeFrequencyFlag: 'UNKNOWN',
  };
  try {
    const report = readValidation();
    verification = {
      flag: String((report as any)?.flag ?? 'UNKNOWN'),
      summary: String((report as any)?.summary ?? 'Validation unavailable'),
      liveTrades: asFinite((report as any)?.liveTrades, 0),
      backtestTrades: asFinite((report as any)?.backtestTrades, 0),
      hasEnoughLiveData: Boolean((report as any)?.hasEnoughLiveData),
      tradeFrequencyFlag: String((report as any)?.tradeFrequencyFlag ?? 'UNKNOWN'),
    };
  } catch (err: any) {
    warnings.push({
      section: 'verification',
      message: `Validation report failed: ${String(err?.message ?? err)}`,
    });
  }

  let research = {
    available: false,
    generatedAt: null as string | null,
    regime: null as string | null,
    bias: null as string | null,
    confidence: null as number | null,
    fallbackReason: null as string | null,
  };
  try {
    const report = readResearch();
    if (report) {
      research = {
        available: true,
        generatedAt: String((report as any).generatedAt ?? now),
        regime: typeof (report as any)?.attribution?.analysisRegime === 'string'
          ? (report as any).attribution.analysisRegime
          : null,
        bias: typeof (report as any)?.attribution?.analysisBias === 'string'
          ? (report as any).attribution.analysisBias
          : null,
        confidence: Number.isFinite((report as any)?.attribution?.analysisConfidence)
          ? Number((report as any).attribution.analysisConfidence)
          : null,
        fallbackReason: typeof (report as any)?.fallbackReason === 'string'
          ? (report as any).fallbackReason
          : null,
      };
    }
  } catch (err: any) {
    warnings.push({
      section: 'research',
      message: `Research read failed: ${String(err?.message ?? err)}`,
    });
  }

  const trades = buildTradeStats(portfolio.trades);

  const snapshot: ProfitabilityLoopSnapshot = {
    generatedAt: now,
    profitability: {
      equity: Number(portfolio.equity.toFixed(2)),
      realizedPnl: Number(portfolio.pnl.toFixed(2)),
      returnPct: toPct((portfolio.equity - 10000) / 10000),
      resolvedTradeCount: trades.resolvedTradeCount,
      winRate: trades.winRate,
      profitFactor: trades.profitFactor,
    },
    signalQuality: {
      tracked: asFinite(signalMetrics.totals.tracked, completedSignalCount),
      active: asFinite(signalMetrics.totals.active, 0),
      completed: asFinite(signalMetrics.totals.completed, completedSignalCount),
      successRate: asFinite(signalMetrics.rates.successRate, 0),
      failureRate: asFinite(signalMetrics.rates.failureRate, 0),
      timeoutRate: asFinite(signalMetrics.rates.timeoutRate, 0),
      avgMfePct: asFinite(signalMetrics.excursions.avgMfePct, 0),
      avgMaePct: asFinite(signalMetrics.excursions.avgMaePct, 0),
    },
    safety: risk,
    verification,
    research,
    tuningFocus: [],
    warnings,
  };

  snapshot.tuningFocus = buildTuningFocus(snapshot);
  return snapshot;
}
