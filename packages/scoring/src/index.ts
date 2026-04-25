// @promptscore/scoring — Check registry, aggregator, rubric (pure functions)
export type { Check, CheckResult, CheckCategory, CheckType } from "./types";
export { scored, notScored } from "./types";
export { runChecks } from "./runner";
export type { RunnerResult } from "./runner";
export { aggregate, CATEGORY_WEIGHTS } from "./aggregate";
export type { ScanAggregate, PriorityAction } from "./aggregate";
export { ALL_CHECKS } from "./registry";
export { EFFORT_MAP } from "./effort-map";
export { SCORING_VERSION } from "./version";
export { CHECK_COPY } from "./check-copy";
export type { CheckCopy } from "./check-copy";
export { buildNarrative, getScoreBand, SCORE_BANDS } from "./narrative";
export type { Narrative, NarrativePositive, NarrativeNegative, NarrativePriorityAction, BandInfo, ScoreBand } from "./narrative";
