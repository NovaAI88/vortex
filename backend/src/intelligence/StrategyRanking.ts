// StrategyRanking.ts
// Compares all variants and ranks them using their evaluation score

import { StrategyEvaluation } from './StrategyEvaluation';

export class StrategyRanking {
  // Returns a sorted copy from best to worst (highest to lowest score)
  static rank(evaluations: StrategyEvaluation[]): StrategyEvaluation[] {
    return [...evaluations].sort((a, b) => b.score - a.score);
  }
}
