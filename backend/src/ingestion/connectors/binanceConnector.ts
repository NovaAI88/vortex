// Binance connector for BTCUSDT — streams into event bus
import WebSocket from 'ws';

import { adaptBinanceTradeToMarketEvent } from '../adapters/binanceAdapter';
import { publishMarketEvent } from '../publishers/marketEventPublisher';
import { EventBus } from '../../events/eventBus';

const BINANCE_WS_ENDPOINTS = [
  'wss://stream.binance.com:443/ws/btcusdt@trade',
  'wss://data-stream.binance.vision/ws/btcusdt@trade',
  'wss://stream.binance.com:9443/ws/btcusdt@trade',
] as const;

const BINANCE_REST_TRADES_URL = 'https://api.binance.com/api/v3/trades?symbol=BTCUSDT&limit=1';

let activeWs: WebSocket | null = null;
let reconnectTimer: NodeJS.Timeout | null = null;
let restPollTimer: NodeJS.Timeout | null = null;
let stopRequested = false;
let activeEndpointIndex = 0;

const RECONNECT_DELAY_MS = 3000;
const REST_POLL_INTERVAL_MS = 2000;

function clearReconnectTimer() {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
}

function stopRestPolling() {
  if (restPollTimer) {
    clearInterval(restPollTimer);
    restPollTimer = null;
  }
}

function restTradeToWsTrade(raw: any) {
  return {
    e: 'trade',
    s: 'BTCUSDT',
    p: String(raw?.price ?? '0'),
    q: String(raw?.qty ?? '0'),
    T: Number(raw?.time ?? Date.now()),
    a: raw?.id,
  };
}

export function startBinanceConnector(bus: EventBus) {
  stopRequested = false;

  function startRestPollingFallback() {
    if (restPollTimer || stopRequested) return;

    console.log('[BinanceConnector] Starting REST fallback polling: https://api.binance.com/api/v3/trades');

    restPollTimer = setInterval(async () => {
      if (stopRequested) return;

      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 4000);

        const resp = await fetch(BINANCE_REST_TRADES_URL, {
          method: 'GET',
          signal: controller.signal,
          headers: {
            Accept: 'application/json',
          },
        });

        clearTimeout(timeout);

        if (!resp.ok) {
          console.error(`[BinanceConnector] REST fallback error: HTTP ${resp.status}`);
          return;
        }

        const data = await resp.json();
        const trade = Array.isArray(data) ? data[0] : null;
        if (!trade) return;

        const evt = adaptBinanceTradeToMarketEvent(restTradeToWsTrade(trade));
        publishMarketEvent(bus, evt, 'binance-rest-fallback');
      } catch (err) {
        console.error('[BinanceConnector] REST fallback request failed:', err);
      }
    }, REST_POLL_INTERVAL_MS);
  }

  function scheduleReconnect(fromIndex = 0) {
    if (stopRequested) return;
    clearReconnectTimer();
    reconnectTimer = setTimeout(() => connectWithFallback(fromIndex), RECONNECT_DELAY_MS);
  }

  function connectWithFallback(startIndex = 0) {
    if (stopRequested) return;

    let endpointIndex = startIndex;

    const tryNextEndpoint = () => {
      if (stopRequested) return;

      if (endpointIndex >= BINANCE_WS_ENDPOINTS.length) {
        console.error('[BinanceConnector] All endpoints failed. Retrying fallback chain in 3s…');
        startRestPollingFallback();
        scheduleReconnect(0);
        return;
      }

      const endpoint = BINANCE_WS_ENDPOINTS[endpointIndex];
      const currentIndex = endpointIndex;
      endpointIndex += 1;

      console.log(`[BinanceConnector] Attempting endpoint ${currentIndex + 1}/${BINANCE_WS_ENDPOINTS.length}: ${endpoint}`);

      let opened = false;
      const ws = new WebSocket(endpoint);

      ws.on('open', () => {
        opened = true;
        activeWs = ws;
        activeEndpointIndex = currentIndex;
        stopRestPolling();
        console.log(`[BinanceConnector] Connected via ${endpoint}`);
      });

      ws.on('message', (data) => {
        try {
          const msg = JSON.parse(data.toString());
          const evt = adaptBinanceTradeToMarketEvent(msg);
          publishMarketEvent(bus, evt, 'binance');
        } catch (e) {
          console.error('[BinanceConnector] Parse error:', e);
        }
      });

      ws.on('error', (err) => {
        console.error(`[BinanceConnector] Endpoint error (${endpoint}):`, err);

        if (!opened) {
          ws.removeAllListeners();
          tryNextEndpoint();
          return;
        }

        try {
          ws.close();
        } catch {
          // no-op
        }
      });

      ws.on('close', () => {
        if (!opened) return;

        console.log(`[BinanceConnector] Connection closed (${endpoint}). Reconnecting in 3s…`);
        if (activeWs === ws) activeWs = null;
        startRestPollingFallback();
        scheduleReconnect(activeEndpointIndex);
      });
    };

    tryNextEndpoint();
  }

  connectWithFallback(0);

  return () => {
    stopRequested = true;
    clearReconnectTimer();
    stopRestPolling();

    if (activeWs) {
      try {
        activeWs.close();
      } catch {
        // no-op
      }
      activeWs = null;
    }
  };
}
