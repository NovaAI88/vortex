// decisionState: capped in-memory log for decisions
import { ActionCandidate } from '../../models/ActionCandidate';
const MAX_DECISIONS = 20;
const decisions: ActionCandidate[] = [];
export function logDecision(decision: ActionCandidate) {
  decisions.push(decision);
  while (decisions.length > MAX_DECISIONS) decisions.shift();
}
export function getRecentDecisions(): ActionCandidate[] {
  return decisions.slice(-MAX_DECISIONS).reverse();
}
