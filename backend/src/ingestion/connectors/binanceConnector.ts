// Binance connector for BTCUSDT — streams into event bus
import WebSocket from 'ws';
import { adaptBinanceTradeToMarketEvent } from '../adapters/binanceAdapter';
import { publishMarketEvent } from '../publishers/marketEventPublisher';
import { EventBus } from '../../events/eventBus';

const BINANCE_WS_URL = 'wss://stream.binance.com:9443/ws/btcusdt@trade';
let activeWs: WebSocket|null = null;
let reconnectTimer: NodeJS.Timeout|null = null;

export function startBinanceConnector(bus: EventBus) {
  function connect() {
    activeWs = new WebSocket(BINANCE_WS_URL);
    activeWs.on('open', () => console.log('[BinanceConnector] Connected.'));
    activeWs.on('message', data => {
      try {
        const msg = JSON.parse(data.toString());
        const evt = adaptBinanceTradeToMarketEvent(msg);
        publishMarketEvent(bus, evt, 'binance');
      } catch(e) {
        console.error('[BinanceConnector] Parse error:', e);
      }
    });
    activeWs.on('close', () => {
      console.log('[BinanceConnector] Closed. Reconnecting in 3s…');
      reconnectTimer = setTimeout(connect, 3000);
    });
    activeWs.on('error', err => {
      console.error('[BinanceConnector] Error:', err);
      if (activeWs) activeWs.close();
    });
  }
  connect();
  return () => {
    if (activeWs) activeWs.close();
    if (reconnectTimer) clearTimeout(reconnectTimer);
  };
}
