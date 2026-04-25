import type { RunnerResult } from "./runner";
import type { ScanAggregate, PriorityAction } from "./aggregate";
import { CHECK_COPY } from "./check-copy";

export type ScoreBand =
  | "ai-ready-leader"
  | "solid-foundation"
  | "partial-readiness"
  | "significant-gaps"
  | "high-risk";

export interface BandInfo {
  band: ScoreBand;
  label: string;
  description: string;
  color: "green" | "teal" | "yellow" | "orange" | "red";
}

export const SCORE_BANDS: Array<{ min: number; info: BandInfo }> = [
  {
    min: 85,
    info: {
      band: "ai-ready-leader",
      label: "AI-Ready Leader",
      description: "Your site is well-optimised for AI search. Focus on maintaining freshness and expanding your authority signals.",
      color: "green",
    },
  },
  {
    min: 70,
    info: {
      band: "solid-foundation",
      label: "Solid Foundation",
      description: "Strong fundamentals in place. A few targeted fixes could move you into leader territory.",
      color: "teal",
    },
  },
  {
    min: 55,
    info: {
      band: "partial-readiness",
      label: "Partial Readiness",
      description: "You've made some progress but significant gaps remain. Focus on the priority actions below.",
      color: "yellow",
    },
  },
  {
    min: 35,
    info: {
      band: "significant-gaps",
      label: "Significant Gaps",
      description: "Multiple fundamental issues are limiting your AI search visibility. Start with the quick wins.",
      color: "orange",
    },
  },
  {
    min: 0,
    info: {
      band: "high-risk",
      label: "High Risk",
      description: "Your site has critical barriers preventing AI systems from finding, reading, or trusting your content.",
      color: "red",
    },
  },
];

export function getScoreBand(score: number): BandInfo {
  for (const { min, info } of SCORE_BANDS) {
    if (score >= min) return info;
  }
  return SCORE_BANDS[SCORE_BANDS.length - 1].info;
}

export interface NarrativePositive {
  key: string;
  title: string;
  explanation: string;
}

export interface NarrativeNegative {
  key: string;
  title: string;
  explanation: string;
}

export interface NarrativePriorityAction {
  key: string;
  title: string;
  howToFix: string;
  effort: string;
  notes?: string;
}

export interface Narrative {
  band: BandInfo;
  headlineSummary: string;
  topPositives: NarrativePositive[];
  topNegatives: NarrativeNegative[];
  priorityActions: NarrativePriorityAction[];
  notScoredCount: number;
}

export function buildNarrative(agg: ScanAggregate): Narrative {
  const band = getScoreBand(agg.overall_score);

  const topPositives: NarrativePositive[] = agg.positives
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 3)
    .map((r) => ({
      key: r.key,
      title: CHECK_COPY[r.key]?.title ?? r.key,
      explanation: CHECK_COPY[r.key]?.positiveExplanation ?? "",
    }));

  const topNegatives: NarrativeNegative[] = agg.negatives
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 3)
    .map((r) => ({
      key: r.key,
      title: CHECK_COPY[r.key]?.title ?? r.key,
      explanation: CHECK_COPY[r.key]?.negativeExplanation ?? "",
    }));

  const priorityActions: NarrativePriorityAction[] = agg.priority_actions.map(
    (action: PriorityAction) => ({
      key: action.key,
      title: CHECK_COPY[action.key]?.title ?? action.key,
      howToFix: CHECK_COPY[action.key]?.howToFix ?? "",
      effort: action.effort,
      notes: action.notes,
    })
  );

  const headlineSummary = buildHeadline(agg.overall_score, band);

  return {
    band,
    headlineSummary,
    topPositives,
    topNegatives,
    priorityActions,
    notScoredCount: agg.not_scored_count,
  };
}

function buildHeadline(score: number, band: BandInfo): string {
  switch (band.band) {
    case "ai-ready-leader":
      return `With a score of ${score}/100, your site is in the top tier for AI search readiness. You're well-positioned to appear in AI-generated answers.`;
    case "solid-foundation":
      return `With a score of ${score}/100, your site has strong AI-readiness fundamentals. A few targeted improvements could push you into leader territory.`;
    case "partial-readiness":
      return `With a score of ${score}/100, your site has made partial progress on AI readiness. The priority actions below will have the biggest impact.`;
    case "significant-gaps":
      return `With a score of ${score}/100, your site has significant AI readiness gaps. Addressing the priority actions below will meaningfully improve your AI search visibility.`;
    case "high-risk":
      return `With a score of ${score}/100, critical barriers are preventing AI systems from finding and trusting your content. Start with the quick wins below.`;
  }
}
