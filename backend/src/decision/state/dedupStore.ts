// VORTEX — Decision Dedup Store (Persistent, TTL-aware)
//
// Purpose: prevent re-execution of the same decision ID across restarts.
// Without this, a system restart could re-process decisions that were
// already executed in the previous session.
//
// Design:
// - IDs stored with a timestamp
// - Entries expire after TTL_MS (default: 1 hour)
// - Store is flushed to disk on every write
// - Expired entries are pruned on load and on each write

import fs from 'node:fs';
import path from 'node:path';

const TTL_MS = 60 * 60 * 1000; // 1 hour — covers any realistic restart window
const DATA_DIR = path.resolve(process.cwd(), 'data');
const DEDUP_FILE = path.join(DATA_DIR, 'processed-ids.json');

type DedupEntry = { addedAt: number };
type DedupStore = Record<string, DedupEntry>;

let store: DedupStore = {};

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

function pruneExpired(s: DedupStore): DedupStore {
  const now = Date.now();
  const pruned: DedupStore = {};
  for (const [id, entry] of Object.entries(s)) {
    if (now - entry.addedAt < TTL_MS) pruned[id] = entry;
  }
  return pruned;
}

function persistStore(): void {
  try {
    ensureDataDir();
    store = pruneExpired(store);
    fs.writeFileSync(DEDUP_FILE, JSON.stringify(store, null, 2), 'utf8');
  } catch (e) {
    console.error('[VORTEX] Dedup store write failed:', e);
  }
}

export function loadDedupStore(): void {
  ensureDataDir();
  if (!fs.existsSync(DEDUP_FILE)) {
    store = {};
    return;
  }
  try {
    const raw = fs.readFileSync(DEDUP_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    // Prune expired on load — don't carry stale IDs into memory
    store = pruneExpired(typeof parsed === 'object' && parsed !== null ? parsed : {});
  } catch {
    store = {};
  }
}

export function hasProcessedId(id: string): boolean {
  const entry = store[id];
  if (!entry) return false;
  if (Date.now() - entry.addedAt >= TTL_MS) {
    delete store[id];
    return false;
  }
  return true;
}

export function markProcessedId(id: string): void {
  store[id] = { addedAt: Date.now() };
  persistStore();
}
