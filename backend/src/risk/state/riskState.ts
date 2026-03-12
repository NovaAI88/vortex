// riskState: capped in-memory log for risk evaluations
import { RiskDecision } from '../../models/RiskDecision';
const MAX_RISKS = 20;
const risks: RiskDecision[] = [];
export function logRisk(risk: RiskDecision) {
  risks.push(risk);
  while (risks.length > MAX_RISKS) risks.shift();
}
export function getRecentRisks(): RiskDecision[] {
  return risks.slice(-MAX_RISKS).reverse();
}
