// Ingestion Orchestrator: configurable data source (mock or binance)
import { EventBus } from '../events/eventBus';
import { getMockRawPayload } from './connectors/mockConnector';
import { adaptBinanceTradeToMarketEvent } from './adapters/binanceAdapter';
import { publishMarketEvent } from './publishers/marketEventPublisher';

export function startIngestion(bus: EventBus, useLive=false) {
  let stop: null | (() => void) = null;

  if (useLive) {
    // Dynamically require only if useLive
    let startBinanceConnector;
    try {
      startBinanceConnector = require('./connectors/binanceConnector').startBinanceConnector;
      stop = startBinanceConnector(bus);
      console.log('[ingestion] Live Binance connector started.');
    } catch (e) {
      console.error('[ingestion] Cannot start live Binance ingestion: ws module or connector missing.', e);
      stop = () => {};
    }
  } else {
    // Mock: periodic random trades
    const interval = setInterval(() => {
      const raw = getMockRawPayload();
      const evt = adaptBinanceTradeToMarketEvent(raw);
      publishMarketEvent(bus, evt, 'mock');
    }, 2000);
    stop = () => clearInterval(interval);
    console.log('[ingestion] Mock ingestion started.');
  }
  return stop;
}
