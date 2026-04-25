import type { CheckCategory } from "./types";
import type { RunnerResult } from "./runner";
import { EFFORT_MAP } from "./effort-map";

export const CATEGORY_WEIGHTS: Record<CheckCategory, number> = {
  crawler_access: 20,
  structured_data: 25,
  content_clarity: 25,
  ai_specific: 15,
  authority_trust: 15,
};

export interface PriorityAction {
  key: string;
  category: CheckCategory;
  score: number;
  weight: number;
  effort: string;
  notes?: string;
}

export interface ScanAggregate {
  overall_score: number;
  category_scores: Record<CheckCategory, number>;
  category_weights_used: Record<CheckCategory, number>;
  positives: RunnerResult[];
  negatives: RunnerResult[];
  priority_actions: PriorityAction[];
  not_scored_count: number;
}

export function aggregate(results: RunnerResult[]): ScanAggregate {
  const categories = Object.keys(CATEGORY_WEIGHTS) as CheckCategory[];

  const categoryScores: Record<CheckCategory, number> = {} as Record<CheckCategory, number>;
  const categoryWeightsUsed: Record<CheckCategory, number> = {} as Record<CheckCategory, number>;

  for (const cat of categories) {
    const catResults = results.filter((r) => r.category === cat);
    const scorable = catResults.filter((r) => !r.result.not_scored);
    const totalWeight = scorable.reduce((s, r) => s + r.weight, 0);

    if (totalWeight === 0) {
      categoryScores[cat] = 0;
      categoryWeightsUsed[cat] = 0;
    } else {
      const weightedSum = scorable.reduce((s, r) => s + r.result.score * r.weight, 0);
      categoryScores[cat] = Math.round((weightedSum / totalWeight) * 100);
      categoryWeightsUsed[cat] = totalWeight;
    }
  }

  // Overall: weighted average of category scores, renormalising if any category is fully not_scored
  const scorableCategories = categories.filter((c) => categoryWeightsUsed[c] > 0);
  const totalCatWeight = scorableCategories.reduce((s, c) => s + CATEGORY_WEIGHTS[c], 0);
  const overallScore = totalCatWeight === 0
    ? 0
    : Math.round(
        scorableCategories.reduce((s, c) => s + categoryScores[c] * CATEGORY_WEIGHTS[c], 0) / totalCatWeight
      );

  const positives = results.filter((r) => !r.result.not_scored && r.result.score >= 0.8);
  const negatives = results.filter((r) => !r.result.not_scored && r.result.score < 0.5);

  // Priority actions: failing checks ranked by (weight * category_weight / effort_cost)
  const effortCost: Record<string, number> = { small: 1, medium: 2, large: 4 };
  const actions: PriorityAction[] = negatives
    .map((r) => {
      const effort = EFFORT_MAP[r.key] ?? "medium";
      const catWeight = CATEGORY_WEIGHTS[r.category as CheckCategory] ?? 1;
      const impact = (r.weight * catWeight) / effortCost[effort];
      return { key: r.key, category: r.category as CheckCategory, score: r.result.score, weight: r.weight, effort, notes: r.result.notes, _impact: impact };
    })
    .sort((a, b) => b._impact - a._impact)
    .slice(0, 5)
    .map(({ _impact: _, ...rest }) => rest);

  const notScoredCount = results.filter((r) => r.result.not_scored).length;

  return {
    overall_score: overallScore,
    category_scores: categoryScores,
    category_weights_used: categoryWeightsUsed,
    positives,
    negatives,
    priority_actions: actions,
    not_scored_count: notScoredCount,
  };
}
