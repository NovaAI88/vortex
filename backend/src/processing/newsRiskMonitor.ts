// VORTEX — News Risk Monitor (Phase 1)
//
// Polls 2 public crypto RSS feeds every 5 minutes.
// If a high-risk keyword appears in a headline published in the last 30 minutes,
// sets newsRiskActive = true for the next poll cycle.
//
// Design rules:
// - No external dependencies — XML parsed with targeted regex (RSS is simple)
// - No sentiment scoring, no LLM, no broad crawling
// - Flag expires automatically after 30 minutes if no matching articles
// - Failure to reach both feeds: retain last known flag, clear if stale (>30 min old)
// - Output is advisory only — execution cannot be triggered by this flag directly
//
// Usage in regime detection (Phase 2): newsRiskFlag = true → contribute to HIGH_RISK signal

import { logger } from '../utils/logger';

// --- Configuration ---

const POLL_INTERVAL_MS  = 5 * 60 * 1000;   // 5 minutes
const INITIAL_DELAY_MS  = 10 * 1000;        // 10 seconds after startup
const LOOKBACK_MS       = 30 * 60 * 1000;   // 30-minute headline window
const FLAG_TTL_MS       = 30 * 60 * 1000;   // flag expires 30 min after last match
const FETCH_TIMEOUT_MS  = 8 * 1000;

const FEEDS = [
  'https://www.coindesk.com/arc/outboundfeeds/rss/',
  'https://cryptopanic.com/news/rss/',
];

// Partial-word keywords — matched case-insensitively against title + description
const HIGH_RISK_KEYWORDS = [
  'sec ',        // SEC (with trailing space to avoid false positives like "second")
  ' sec\n',
  ' sec,',
  ' sec.',
  'hack',
  'exploit',
  'breach',
  ' ban ',
  'banned',
  'shutdown',
  'shut down',
  'arrest',
  'seized',
  'seizure',
  'emergency',
  'crash',
  'collapse',
  'liquidat',    // liquidation / liquidated
  'flash crash',
  'halted',
  'exchange halt',
  'network attack',
  '51%',
  'insolvent',
  'insolvency',
  'regulatory action',
];

// --- State ---

let newsRiskActive    = false;
let lastMatchAt: number | null = null;   // epoch ms of most recent keyword match
let lastSuccessfulPoll: number | null = null;
let pollTimer: NodeJS.Timeout | null = null;
let matchedHeadline: string | null = null;  // for logging/debugging

// --- RSS parsing (no external library) ---

function extractItems(xml: string): Array<{ title: string; description: string; pubDate: string }> {
  const items: Array<{ title: string; description: string; pubDate: string }> = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/gi;
  let match: RegExpExecArray | null;

  while ((match = itemRegex.exec(xml)) !== null) {
    const block = match[1];
    const title       = extractTag(block, 'title');
    const description = extractTag(block, 'description');
    const pubDate     = extractTag(block, 'pubDate');
    items.push({ title, description, pubDate });
  }

  return items;
}

function extractTag(block: string, tag: string): string {
  // Handles plain text and CDATA: <tag>...</tag> or <tag><![CDATA[...]]></tag>
  const regex = new RegExp(`<${tag}[^>]*>(?:<!\\[CDATA\\[)?([\\s\\S]*?)(?:\\]\\]>)?<\\/${tag}>`, 'i');
  const m = block.match(regex);
  return m ? m[1].trim() : '';
}

function parseDate(pubDate: string): number {
  if (!pubDate) return 0;
  try {
    const d = new Date(pubDate);
    return Number.isFinite(d.getTime()) ? d.getTime() : 0;
  } catch {
    return 0;
  }
}

function containsKeyword(text: string): string | null {
  const lower = text.toLowerCase();
  for (const kw of HIGH_RISK_KEYWORDS) {
    if (lower.includes(kw)) return kw;
  }
  return null;
}

// --- Fetch and evaluate a single feed ---

async function evaluateFeed(url: string): Promise<{ matched: boolean; headline: string | null }> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const resp = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'VORTEX-NewsMonitor/1.0', Accept: 'application/rss+xml, application/xml, text/xml' },
    });
    clearTimeout(timeout);

    if (!resp.ok) {
      logger.warn('newsRiskMonitor', `Feed returned HTTP ${resp.status}`, { url });
      return { matched: false, headline: null };
    }

    const xml  = await resp.text();
    const now  = Date.now();
    const items = extractItems(xml);

    for (const item of items) {
      const pubMs = parseDate(item.pubDate);
      if (pubMs === 0 || now - pubMs > LOOKBACK_MS) continue;  // skip old or undated items

      const combined = `${item.title} ${item.description}`;
      const kw = containsKeyword(combined);
      if (kw) {
        return { matched: true, headline: item.title.slice(0, 120) };
      }
    }

    return { matched: false, headline: null };
  } catch (e: any) {
    clearTimeout(timeout);
    const isAbort = e?.name === 'AbortError';
    logger.warn('newsRiskMonitor', isAbort ? 'Feed fetch timed out' : 'Feed fetch error', { url, err: String(e) });
    return { matched: false, headline: null };
  }
}

// --- Main poll cycle ---

async function poll(): Promise<void> {
  let anySuccess = false;
  let anyMatch   = false;
  let headline: string | null = null;

  for (const url of FEEDS) {
    try {
      const result = await evaluateFeed(url);
      anySuccess = true;
      if (result.matched) {
        anyMatch   = true;
        headline   = result.headline;
        break;  // one match is sufficient — no need to check second feed
      }
    } catch {
      // evaluateFeed handles its own errors; this is a belt-and-braces catch
    }
  }

  const now = Date.now();

  if (anySuccess) {
    lastSuccessfulPoll = now;
  }

  if (anyMatch) {
    if (!newsRiskActive) {
      logger.warn('newsRiskMonitor', 'NEWS RISK FLAG ACTIVATED', { headline });
    }
    newsRiskActive  = true;
    lastMatchAt     = now;
    matchedHeadline = headline;
    return;
  }

  // No match this cycle — check if flag should expire
  if (newsRiskActive) {
    const matchAge = lastMatchAt ? now - lastMatchAt : Infinity;
    if (matchAge > FLAG_TTL_MS) {
      logger.info('newsRiskMonitor', 'News risk flag cleared — no matching headlines in 30 min');
      newsRiskActive  = false;
      lastMatchAt     = null;
      matchedHeadline = null;
    }
  }

  // If both feeds failed and last success was > 30 min ago, clear flag (stale data)
  if (!anySuccess && lastSuccessfulPoll !== null) {
    const pollAge = now - lastSuccessfulPoll;
    if (pollAge > FLAG_TTL_MS && newsRiskActive) {
      logger.warn('newsRiskMonitor', 'Both feeds unreachable for 30+ min — clearing stale news risk flag');
      newsRiskActive = false;
    }
  }
}

// --- Public API ---

export function isNewsRiskActive(): boolean {
  return newsRiskActive;
}

export function getNewsRiskState(): {
  active: boolean;
  lastMatchAt: string | null;
  lastSuccessfulPoll: string | null;
  matchedHeadline: string | null;
} {
  return {
    active: newsRiskActive,
    lastMatchAt:        lastMatchAt        ? new Date(lastMatchAt).toISOString()        : null,
    lastSuccessfulPoll: lastSuccessfulPoll ? new Date(lastSuccessfulPoll).toISOString() : null,
    matchedHeadline,
  };
}

export function startNewsRiskMonitor(): void {
  if (pollTimer) return;  // already running

  logger.info('newsRiskMonitor', 'Starting — polling every 5 min', {
    feeds: FEEDS.length,
    lookbackMin: LOOKBACK_MS / 60000,
    flagTtlMin: FLAG_TTL_MS / 60000,
  });

  // First poll after a short delay to let pipelines settle
  setTimeout(() => {
    poll().catch(e => logger.error('newsRiskMonitor', 'Poll error', { err: String(e) }));
    pollTimer = setInterval(() => {
      poll().catch(e => logger.error('newsRiskMonitor', 'Poll error', { err: String(e) }));
    }, POLL_INTERVAL_MS);
  }, INITIAL_DELAY_MS);
}
