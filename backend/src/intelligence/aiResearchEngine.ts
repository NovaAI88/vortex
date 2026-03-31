import { randomUUID } from 'node:crypto';
import { AIAnalysis } from './aiAnalysisEngine';
import { ProcessedMarketState } from '../models/ProcessedMarketState';

export type AIResearchStatus = 'ok' | 'fallback';

export interface ResearchSignal {
  name: string;
  value: number | string | boolean | null;
  source: 'ai_analysis' | 'market_state';
}

export interface AIResearchReport {
  id: string;
  generatedAt: string;
  status: AIResearchStatus;
  source: 'deterministic.v1';
  summary: string;
  marketInterpretation: string;
  hypotheses: string[];
  riskFlags: string[];
  constraints: string[];
  recommendedAction: 'observe' | 'long_bias_only' | 'short_bias_only' | 'range_probe_only' | 'risk_off';
  attribution: {
    analysisTimestamp: string;
    analysisRegime: AIAnalysis['regime'];
    analysisBias: AIAnalysis['bias'];
    analysisConfidence: number;
    marketTimestamp: string;
    symbol: string;
  };
  signals: ResearchSignal[];
  fallbackReason?: string;
}

function normalizeConfidence(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Number(Math.max(0, Math.min(1, value)).toFixed(4));
}

function chooseAction(analysis: AIAnalysis): AIResearchReport['recommendedAction'] {
  if (analysis.regime === 'HIGH_RISK') return 'risk_off';
  if (analysis.regime === 'TREND' && analysis.bias === 'LONG') return 'long_bias_only';
  if (analysis.regime === 'TREND' && analysis.bias === 'SHORT') return 'short_bias_only';
  if (analysis.regime === 'RANGE') return 'range_probe_only';
  return 'observe';
}

export function buildFallbackResearchReport(
  analysis: AIAnalysis,
  state: ProcessedMarketState,
  reason: string,
): AIResearchReport {
  return {
    id: randomUUID(),
    generatedAt: new Date().toISOString(),
    status: 'fallback',
    source: 'deterministic.v1',
    summary: 'Fallback research output used due to upstream research generation failure.',
    marketInterpretation: 'Research output degraded; use conservative controls until normal generation resumes.',
    hypotheses: [
      'Signal quality may be temporarily reduced while fallback mode is active.',
      'System should remain operational because fallback output preserves explicit contracts.',
    ],
    riskFlags: ['research_generation_failure'],
    constraints: [
      'No direct execution permissions are granted by research output.',
      'Research is advisory only and must flow through decision/risk gates.',
    ],
    recommendedAction: 'observe',
    attribution: {
      analysisTimestamp: analysis.timestamp,
      analysisRegime: analysis.regime,
      analysisBias: analysis.bias,
      analysisConfidence: normalizeConfidence(analysis.confidence),
      marketTimestamp: state.timestamp,
      symbol: state.symbol,
    },
    signals: [
      { name: 'analysis_confidence', value: normalizeConfidence(analysis.confidence), source: 'ai_analysis' },
      { name: 'volatility_level', value: analysis.volatilityLevel ?? null, source: 'ai_analysis' },
      { name: 'news_risk_flag', value: state.newsRiskFlag ?? false, source: 'market_state' },
    ],
    fallbackReason: reason,
  };
}

export function buildResearchReport(
  analysis: AIAnalysis,
  state: ProcessedMarketState,
): AIResearchReport {
  const confidence = normalizeConfidence(analysis.confidence);
  const riskFlags: string[] = [];
  if (analysis.regime === 'HIGH_RISK') riskFlags.push('high_risk_regime');
  if (state.newsRiskFlag) riskFlags.push('news_risk_flag');
  if (confidence < 0.45) riskFlags.push('low_confidence');

  const interpretation =
    analysis.regime === 'TREND'
      ? `Trend regime detected with ${analysis.bias.toLowerCase()} bias and ${(confidence * 100).toFixed(1)}% confidence.`
      : analysis.regime === 'RANGE'
      ? `Range regime detected with ${(confidence * 100).toFixed(1)}% confidence and mean-reversion posture.`
      : 'High-risk regime detected; directional exposure should be minimized.';

  return {
    id: randomUUID(),
    generatedAt: new Date().toISOString(),
    status: 'ok',
    source: 'deterministic.v1',
    summary: `${analysis.regime} | ${analysis.bias} | conf ${(confidence * 100).toFixed(1)}%`,
    marketInterpretation: interpretation,
    hypotheses: [
      'Regime persistence can increase expected signal quality when confidence remains stable.',
      'Confidence decay or rising volatility should reduce trade aggressiveness.',
    ],
    riskFlags,
    constraints: [
      'Research output is advisory and cannot bypass decision/risk/execution boundaries.',
      'Use output for observability, tuning, and review only.',
    ],
    recommendedAction: chooseAction(analysis),
    attribution: {
      analysisTimestamp: analysis.timestamp,
      analysisRegime: analysis.regime,
      analysisBias: analysis.bias,
      analysisConfidence: confidence,
      marketTimestamp: state.timestamp,
      symbol: state.symbol,
    },
    signals: [
      { name: 'analysis_confidence', value: confidence, source: 'ai_analysis' },
      { name: 'regime_confidence', value: normalizeConfidence(analysis.regimeConfidence), source: 'ai_analysis' },
      { name: 'volatility_level', value: analysis.volatilityLevel ?? null, source: 'ai_analysis' },
      { name: 'price', value: state.price, source: 'market_state' },
      { name: 'news_risk_flag', value: state.newsRiskFlag ?? false, source: 'market_state' },
      { name: 'indicators_warm', value: state.indicatorsWarm ?? false, source: 'market_state' },
    ],
  };
}
