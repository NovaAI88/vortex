// Orchestrates Portfolio/Position Layer: dedup, state update, and event publish
import { EventBus } from '../events/eventBus';
import { EVENT_TOPICS } from '../events/topics';
import { updatePosition } from './state/positionTracker';
import { updatePortfolio } from './state/portfolioTracker';
import { publishPositionSnapshot } from './publishers/positionSnapshotPublisher';
import { publishPortfolioSnapshot } from './publishers/portfolioSnapshotPublisher';

const processedResultIds = new Set<string>();

export function startPortfolioPipeline(bus: EventBus): void {
  bus.subscribe(EVENT_TOPICS.EXECUTION_RESULT, envelope => {
    const result = envelope.payload;
    if (processedResultIds.has(result.id)) return; // dedup
    const positionSnapshot = updatePosition(result);
    const portfolioSnapshot = updatePortfolio(result);
    if (positionSnapshot) publishPositionSnapshot(bus, positionSnapshot, envelope.correlationId);
    if (portfolioSnapshot) publishPortfolioSnapshot(bus, portfolioSnapshot, envelope.correlationId);
    processedResultIds.add(result.id);
  });
}
