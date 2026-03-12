// Ingestion Orchestrator: configurable data source (mock or binance)
import { EventBus } from '../events/eventBus';
import { startBinanceConnector } from './connectors/binanceConnector';
import { getMockRawPayload } from './connectors/mockConnector';
import { adaptBinanceTradeToMarketEvent } from './adapters/binanceAdapter';
import { publishMarketEvent } from './publishers/marketEventPublisher';

export function startIngestion(bus: EventBus, useLive=false) {
  let stop: null | (() => void) = null;

  if (useLive) {
    stop = startBinanceConnector(bus);
  } else {
    // Mock: periodic random trades
    const interval = setInterval(() => {
      const raw = getMockRawPayload();
      const evt = adaptBinanceTradeToMarketEvent(raw);
      publishMarketEvent(bus, evt, 'mock');
    }, 2000);
    stop = () => clearInterval(interval);
  }
  return stop;
}
