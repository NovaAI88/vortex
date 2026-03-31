import { EventBus } from '../events/eventBus';
import { EVENT_TOPICS } from '../events/topics';
import { ProcessedMarketState } from '../models/ProcessedMarketState';
import { AIAnalysis } from './aiAnalysisEngine';
import { AIResearchReport, buildFallbackResearchReport, buildResearchReport } from './aiResearchEngine';
import { loadAIResearchState, saveAIResearchState } from './aiResearchStore';
import { logger } from '../utils/logger';

const HEARTBEAT_MS = 60_000;

let latestAnalysis: AIAnalysis | null = null;
let lastResearch: AIResearchReport | null = loadAIResearchState();
let lastPublishedAt = lastResearch ? Date.parse(lastResearch.generatedAt) || 0 : 0;

export interface AIResearchPipelineOptions {
  generateReport?: (analysis: AIAnalysis, state: ProcessedMarketState) => AIResearchReport;
}

function shouldPublish(next: AIResearchReport): boolean {
  if (!lastResearch) return true;

  const regimeChanged = next.attribution.analysisRegime !== lastResearch.attribution.analysisRegime;
  const biasChanged = next.attribution.analysisBias !== lastResearch.attribution.analysisBias;
  const confShift = Math.abs(next.attribution.analysisConfidence - lastResearch.attribution.analysisConfidence);
  const heartbeatDue = Date.now() - lastPublishedAt >= HEARTBEAT_MS;
  return regimeChanged || biasChanged || confShift >= 0.05 || heartbeatDue;
}

function publishResearch(bus: EventBus, report: AIResearchReport): void {
  if (!shouldPublish(report)) return;

  lastResearch = report;
  lastPublishedAt = Date.now();
  saveAIResearchState(report);

  bus.publish(EVENT_TOPICS.AI_RESEARCH, {
    id: report.id,
    topic: EVENT_TOPICS.AI_RESEARCH,
    timestamp: report.generatedAt,
    producer: 'ai-research-pipeline',
    version: '1.0.0',
    payload: report,
  });
}

export function getLastResearch(): AIResearchReport | null {
  return lastResearch;
}

export function resetResearchPipelineStateForTesting(): void {
  if (process.env.NODE_ENV !== 'test') {
    throw new Error('resetResearchPipelineStateForTesting is test-only and requires NODE_ENV=test');
  }
  latestAnalysis = null;
  lastResearch = null;
  lastPublishedAt = 0;
}

export function startAIResearchPipeline(bus: EventBus, options: AIResearchPipelineOptions = {}): void {
  const generateReport = options.generateReport ?? buildResearchReport;

  bus.subscribe(EVENT_TOPICS.AI_ANALYSIS, envelope => {
    latestAnalysis = envelope.payload as AIAnalysis;
  });

  bus.subscribe(EVENT_TOPICS.PROCESSING_STATE, envelope => {
    const analysis = latestAnalysis;
    if (!analysis) return;

    const state = envelope.payload as ProcessedMarketState;

    try {
      const report = generateReport(analysis, state);
      publishResearch(bus, report);
    } catch (err: any) {
      const fallback = buildFallbackResearchReport(
        analysis,
        state,
        String(err?.message ?? err ?? 'unknown_research_error'),
      );
      publishResearch(bus, fallback);
      logger.error('aiResearch', 'Research generation failed; fallback output published', {
        reason: fallback.fallbackReason,
      });
    }
  });

  logger.info('aiResearch', 'AI research pipeline started', {
    loadedFromDisk: !!lastResearch,
    heartbeatMs: HEARTBEAT_MS,
  });
}
