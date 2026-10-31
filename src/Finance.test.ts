import { describe, expect, it } from "vitest"

import { balanceFor, buildStatement } from "./Finance"

describe("invoice carry-forward accounting", () => {
  const ledger = {
    invoices: [
      {
        id: 1,
        student: 7,
        total: 100,
        carryForward: 0,
        status: "issued",
        createdAt: "2026-01-01",
        lines: [{ description: "Tuition", amount: 100 }],
      },

      {
        id: 2,
        student: 7,
        total: 150,
        carryForward: 50,
        status: "issued",
        createdAt: "2026-04-01",
        lines: [
          { description: "Tuition", amount: 100 },
          { description: "Previous term balance", amount: 50 },
        ],
      },
    ],

    payments: [{ id: 1, student: 7, amount: 80, paidAt: "2026-04-10", status: "valid" }],

    adjustments: [],
  }

  it("counts original charges once and keeps the outstanding balance correct", () => {
    expect(balanceFor(7, ledger)).toEqual({
      billed: 200,
      adjusted: 0,
      paid: 80,
      balance: 120,
    })

    expect(buildStatement(7, ledger).map((row) => row.charge)).toEqual([100, 100, 0])

    expect(buildStatement(7, ledger).at(-1)?.balance).toBe(120)
  })
})
