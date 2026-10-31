import { describe, expect, it } from "vitest"

import { averagePublishedScore, summarizePaymentsForMonth } from "./adminDashboardData"

describe("admin dashboard summaries", () => {
  it("averages only published marks using each assessment's maximum score", () => {
    expect(
      averagePublishedScore([
        { score: 45, assessment: { status: "published", maxMarks: 50 } },
        { score: 80, assessment: { status: "published", maxMarks: 100 } },
        { score: 100, assessment: { status: "open", maxMarks: 100 } },
        { score: null, assessment: { status: "published", maxMarks: 100 } },
      ]),
    ).toBe(85)
  })

  it("summarizes valid payments from the selected month only", () => {
    expect(
      summarizePaymentsForMonth(
        [
          { amount: 1200, paidAt: "2026-10-04", status: "valid" },
          { amount: 800, paidAt: "2026-10-08", status: "reversed" },
          { amount: 400, paidAt: "2026-09-30", status: "valid" },
        ],
        "2026-10-01",
      ),
    ).toEqual({ count: 1, total: 1200 })
  })
})
