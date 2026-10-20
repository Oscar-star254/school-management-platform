import { describe, expect, it } from "vitest"
import { learnerResults, reportReady } from "./schoolStore"

const school = {
  schoolName: "Test School",
  motto: "Learn",
  learners: [
    {
      admission: "ADM-1",
      name: "Learner One",
      grade: "Grade 5 East",
      status: "Active" as const,
      guardian: "Guardian One",
      phone: "254700000001",
    },
    {
      admission: "ADM-2",
      name: "Learner Two",
      grade: "Grade 5 East",
      status: "Active" as const,
      guardian: "Guardian Two",
      phone: "254700000002",
    },
  ],
  marks: {
    "ADM-1": {
      English: 80,
      Kiswahili: 74,
      Mathematics: 90,
      "Science & Technology": 76,
      "Social Studies": 68,
      "Agriculture & Nutrition": 81,
    },
    "ADM-2": {
      English: 44,
      Kiswahili: null,
      Mathematics: 56,
      "Science & Technology": 61,
      "Social Studies": 50,
      "Agriculture & Nutrition": 58,
    },
  },
}

describe("teacher-to-learner result flow", () => {
  it("returns marks only for the requested learner", () => {
    const first = learnerResults(school, "ADM-1")
    const second = learnerResults(school, "ADM-2")
    expect(first.find((result) => result.area === "English")?.score).toBe(80)
    expect(second.find((result) => result.area === "English")?.score).toBe(44)
  })

  it("makes a report available only when every subject has a mark", () => {
    expect(reportReady(school, "ADM-1")).toBe(true)
    expect(reportReady(school, "ADM-2")).toBe(false)
  })
})
