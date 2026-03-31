import fs from 'node:fs';
import path from 'node:path';
import { AIResearchReport } from './aiResearchEngine';

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DEFAULT_STATE_FILE = path.join(DATA_DIR, 'ai-research-state.json');

function ensureDataDir(): void {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

export function getAIResearchStateFilePath(): string {
  const envPath = process.env.AI_RESEARCH_STATE_FILE;
  if (typeof envPath === 'string' && envPath.trim().length > 0) {
    return path.resolve(envPath.trim());
  }
  return DEFAULT_STATE_FILE;
}

export function loadAIResearchState(): AIResearchReport | null {
  const filePath = getAIResearchStateFilePath();
  if (!fs.existsSync(filePath)) return null;

  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    const parsed = JSON.parse(raw) as AIResearchReport;
    if (!parsed || typeof parsed !== 'object') return null;
    if (typeof parsed.id !== 'string' || typeof parsed.generatedAt !== 'string') return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveAIResearchState(report: AIResearchReport): void {
  const filePath = getAIResearchStateFilePath();
  ensureDataDir();
  fs.writeFileSync(filePath, JSON.stringify(report, null, 2), 'utf8');
}
