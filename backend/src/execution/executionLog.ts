// VORTEX — Execution Audit Log
//
// Dual-mode: in-memory ring buffer for API serving + append-only JSONL disk log.
//
// The disk log is the source of truth for audit purposes.
// It is never overwritten — only appended. Do not rotate or truncate automatically.
// Operator must manage rotation manually if needed.

import fs from 'node:fs';
import path from 'node:path';
import { ExecutionResult } from '../models/ExecutionResult';

const EXEC_LOG_SIZE = 20;
const DATA_DIR = path.resolve(process.cwd(), 'data');
const AUDIT_LOG_FILE = path.join(DATA_DIR, 'execution-audit.jsonl');

const executionResults: ExecutionResult[] = [];

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

function appendToAuditLog(result: ExecutionResult): void {
  try {
    ensureDataDir();
    const line = JSON.stringify(result) + '\n';
    fs.appendFileSync(AUDIT_LOG_FILE, line, 'utf8');
  } catch (e) {
    // Audit log write failure must not crash the execution pipeline
    console.error('[VORTEX] Execution audit log write failed:', e);
  }
}

export function logExecution(result: ExecutionResult): void {
  // In-memory ring buffer for API serving
  executionResults.push(result);
  while (executionResults.length > EXEC_LOG_SIZE) executionResults.shift();

  // Append-only disk audit log — every execution decision recorded permanently
  appendToAuditLog(result);
}

export function getRecentExecutions(): ExecutionResult[] {
  return executionResults.slice(-EXEC_LOG_SIZE).reverse();
}

export function getAuditLogPath(): string {
  return AUDIT_LOG_FILE;
}
