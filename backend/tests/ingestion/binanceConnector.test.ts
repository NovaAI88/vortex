// Test basic Binance connector pipeline
import { startBinanceConnector } from '../../../src/ingestion/connectors/binanceConnector';
import { adaptBinanceTradeToMarketEvent } from '../../../src/ingestion/adapters/binanceAdapter';
import { publishMarketEvent } from '../../../src/ingestion/publishers/marketEventPublisher';
import { EventBus } from '../../../src/events/eventBus';
import { EVENT_TOPICS } from '../../../src/events/topics';

describe('Binance Ingestion Pipeline', () => {
  it('should emit MarketEvent from live Binance trade (BTCUSDT)', done => {
    const bus = new EventBus();
    const cancel = startBinanceConnector(raw => {
      const evt = adaptBinanceTradeToMarketEvent(raw);
      bus.subscribe(EVENT_TOPICS.MARKET_EVENT, envelope => {
        expect(envelope.payload.symbol).toBe('BTCUSDT');
        cancel();
        done();
      });
      publishMarketEvent(bus, evt, "test-binance");
    });
  }, 10000);
});
