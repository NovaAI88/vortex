// Simple Binance connector for one symbol (BTCUSDT), WebSocket stream
import WebSocket from 'ws';

const BINANCE_WS_URL = 'wss://stream.binance.com:9443/ws/btcusdt@trade';

export function startBinanceConnector(onMessage: (payload: any) => void): () => void {
  const ws = new WebSocket(BINANCE_WS_URL);
  ws.on('open', () => console.log('[BinanceConnector] Connected.'));
  ws.on('message', data => {
    try {
      const msg = JSON.parse(data.toString());
      onMessage(msg);
    } catch(e) {
      console.error('[BinanceConnector] Parse error:', e);
    }
  });
  ws.on('close', () => console.log('[BinanceConnector] Closed.'));
  // No auto-reconnect for this stage
  return () => ws.close();
}
