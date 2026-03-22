// VORTEX — Structured Logger
//
// Minimal structured logger: writes JSON-line entries to stdout AND
// appends to data/backend.log for post-mortem debugging.
//
// Design choices:
// - No external dependencies (no pino/winston) — tsx compatibility
// - JSON lines format: one entry per line, easy to grep/parse
// - Log levels: debug | info | warn | error
// - Synchronous append to disk — acceptable at paper-trading volume
// - Log file is append-only; operator manages rotation manually
//
// Usage:
//   import { logger } from '../utils/logger';
//   logger.info('engine', 'Pipeline started');
//   logger.warn('risk', 'Kill switch triggered', { drawdown: 21 });
//   logger.error('monitor', 'Unexpected error', { err: String(e) });

import fs from 'node:fs';
import path from 'node:path';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const DATA_DIR = path.resolve(process.cwd(), 'data');
const LOG_FILE = path.join(DATA_DIR, 'backend.log');

// Minimum level to emit. Set VORTEX_LOG_LEVEL=debug for verbose output.
const LOG_LEVELS: Record<LogLevel, number> = { debug: 0, info: 1, warn: 2, error: 3 };
const MIN_LEVEL: LogLevel = (process.env.VORTEX_LOG_LEVEL as LogLevel) ?? 'info';
const MIN_LEVEL_NUM = LOG_LEVELS[MIN_LEVEL] ?? 1;

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

function write(level: LogLevel, component: string, message: string, meta?: Record<string, unknown>): void {
  if (LOG_LEVELS[level] < MIN_LEVEL_NUM) return;

  const entry = {
    ts: new Date().toISOString(),
    level,
    component,
    message,
    ...(meta && Object.keys(meta).length > 0 ? { meta } : {}),
  };

  const line = JSON.stringify(entry);

  // Stdout — always
  const consoleFn = level === 'error' ? console.error
    : level === 'warn' ? console.warn
    : console.log;
  consoleFn(`[VORTEX] ${line}`);

  // Disk — append-only
  try {
    ensureDataDir();
    fs.appendFileSync(LOG_FILE, line + '\n', 'utf8');
  } catch {
    // Log file write failure must not crash the system
  }
}

export const logger = {
  debug: (component: string, message: string, meta?: Record<string, unknown>) =>
    write('debug', component, message, meta),
  info: (component: string, message: string, meta?: Record<string, unknown>) =>
    write('info', component, message, meta),
  warn: (component: string, message: string, meta?: Record<string, unknown>) =>
    write('warn', component, message, meta),
  error: (component: string, message: string, meta?: Record<string, unknown>) =>
    write('error', component, message, meta),
};
