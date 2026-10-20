import { describe, expect, it } from "vitest"
import {
  feeBalance,
  performanceLevel,
  reportCompleteness,
  resolveConflict,
  weightedResult,
} from "./domain"

describe("CBC grading", () => {
  it("applies primary boundaries and rounding", () => {
    expect(performanceLevel(74.5, "PRIMARY").code).toBe("EE")
    expect(performanceLevel(40.4, "PRIMARY").code).toBe("AE")
  })
  it("applies junior eight-level boundaries", () => {
    expect(performanceLevel(90, "JUNIOR").code).toBe("EE1")
    expect(performanceLevel(57, "JUNIOR").code).toBe("ME2")
    expect(performanceLevel(10, "JUNIOR").code).toBe("BE2")
  })
  it("computes weighted term results", () => {
    expect(
      weightedResult([
        { score: 30, maxScore: 50, weight: 1 },
        { score: 90, maxScore: 100, weight: 2 },
      ]),
    ).toBe(80)
  })
})

describe("report and finance rules", () => {
  it("lists missing report sections", () => {
    const result = reportCompleteness({
      requiredAreas: ["English", "Mathematics"],
      completedAreas: ["English"],
      competencies: true,
      values: false,
      classComment: true,
      headCommentRequired: true,
      headComment: false,
    })
    expect(result.complete).toBe(false)
    expect(result.missing).toEqual([
      "Mathematics",
      "Values",
      "Head teacher comment",
    ])
  })
  it("calculates balances with carried debt", () => {
    expect(feeBalance(36_500, [10_000, 14_050], 0)).toBe(12_450)
  })
})

describe("offline conflict policy", () => {
  const current = {
    actorId: "teacher-1",
    clientUpdatedAt: "2026-06-18T08:00:00Z",
    score: 70,
  }
  it("accepts the newest change", () => {
    expect(
      resolveConflict(
        current,
        { ...current, score: 80, clientUpdatedAt: "2026-06-18T09:00:00Z" },
        false,
      ).value.score,
    ).toBe(80)
  })
  it("keeps drafts when a term locks", () => {
    expect(
      resolveConflict(current, { ...current, score: 80 }, true).reason,
    ).toBe("TERM_LOCKED")
  })
})
