// Simple in-memory execution/trade log for API bridging
import { ExecutionResult } from '../models/ExecutionResult';

const EXEC_LOG_SIZE = 20;
const executionResults: ExecutionResult[] = [];

export function logExecution(result: ExecutionResult) {
  executionResults.push(result);
  while (executionResults.length > EXEC_LOG_SIZE) executionResults.shift();
}

export function getRecentExecutions(): ExecutionResult[] {
  return executionResults.slice(-EXEC_LOG_SIZE).reverse();
}
