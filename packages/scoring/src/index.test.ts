import { describe, it, expect } from "vitest";
import { getScoreBand, buildNarrative } from "./narrative";
import { CHECK_COPY } from "./check-copy";
import { ALL_CHECKS } from "./registry";
import { scored, notScored } from "./types";
import { aggregate } from "./aggregate";
import type { RunnerResult } from "./runner";

describe("scoring", () => {
  it("stub package loads", () => {
    expect(true).toBe(true);
  });
});

describe("getScoreBand", () => {
  it("returns ai-ready-leader for score >= 85", () => {
    expect(getScoreBand(85).band).toBe("ai-ready-leader");
    expect(getScoreBand(100).band).toBe("ai-ready-leader");
  });
  it("returns solid-foundation for 70–84", () => {
    expect(getScoreBand(70).band).toBe("solid-foundation");
    expect(getScoreBand(84).band).toBe("solid-foundation");
  });
  it("returns partial-readiness for 55–69", () => {
    expect(getScoreBand(55).band).toBe("partial-readiness");
  });
  it("returns significant-gaps for 35–54", () => {
    expect(getScoreBand(35).band).toBe("significant-gaps");
  });
  it("returns high-risk for score < 35", () => {
    expect(getScoreBand(0).band).toBe("high-risk");
    expect(getScoreBand(34).band).toBe("high-risk");
  });
});

describe("CHECK_COPY", () => {
  it("has copy for every check key in ALL_CHECKS", () => {
    const missingKeys = ALL_CHECKS.filter((c) => !CHECK_COPY[c.key]).map((c) => c.key);
    expect(missingKeys).toEqual([]);
  });
  it("every entry has title, positiveExplanation, negativeExplanation, howToFix", () => {
    for (const [key, copy] of Object.entries(CHECK_COPY)) {
      expect(copy.title, `${key}.title`).toBeTruthy();
      expect(copy.positiveExplanation, `${key}.positiveExplanation`).toBeTruthy();
      expect(copy.negativeExplanation, `${key}.negativeExplanation`).toBeTruthy();
      expect(copy.howToFix, `${key}.howToFix`).toBeTruthy();
    }
  });
});

describe("buildNarrative", () => {
  it("produces correct band for a low-scoring site", () => {
    const results: RunnerResult[] = ALL_CHECKS.map((c) => ({
      key: c.key,
      category: c.category,
      type: c.type,
      weight: c.weight,
      result: scored(0),
    }));
    const agg = aggregate(results);
    const narrative = buildNarrative(agg);
    expect(narrative.band.band).toBe("high-risk");
    expect(narrative.topPositives).toHaveLength(0);
    expect(narrative.priorityActions.length).toBeLessThanOrEqual(5);
    expect(narrative.headlineSummary).toContain("0/100");
  });

  it("produces correct band for a high-scoring site", () => {
    const results: RunnerResult[] = ALL_CHECKS.map((c) => ({
      key: c.key,
      category: c.category,
      type: c.type,
      weight: c.weight,
      result: scored(1),
    }));
    const agg = aggregate(results);
    const narrative = buildNarrative(agg);
    expect(narrative.band.band).toBe("ai-ready-leader");
    expect(narrative.topNegatives).toHaveLength(0);
  });

  it("handles fully not-scored results gracefully", () => {
    const results: RunnerResult[] = ALL_CHECKS.map((c) => ({
      key: c.key,
      category: c.category,
      type: c.type,
      weight: c.weight,
      result: notScored("no key"),
    }));
    const agg = aggregate(results);
    const narrative = buildNarrative(agg);
    expect(narrative.notScoredCount).toBe(ALL_CHECKS.length);
    expect(narrative.headlineSummary).toContain("0/100");
  });
});

