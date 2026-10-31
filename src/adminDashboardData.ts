export type DashboardMark = {
  score?: number | null
  assessment?: unknown
}

export type DashboardPayment = {
  amount: number
  paidAt?: string
  status?: string
}

export function averagePublishedScore(marks: DashboardMark[]): number | null {
  const scores = marks.flatMap((mark) => {
    const assessment =
      mark.assessment && typeof mark.assessment === "object"
        ? (mark.assessment as { status?: unknown; maxMarks?: unknown })
        : undefined
    if (
      assessment?.status !== "published" ||
      typeof mark.score !== "number" ||
      !Number.isFinite(mark.score)
    )
      return []
    const maximum =
      typeof assessment.maxMarks === "number" && assessment.maxMarks > 0
        ? assessment.maxMarks
        : 100
    return [(mark.score / maximum) * 100]
  })

  return scores.length
    ? Math.round(scores.reduce((total, score) => total + score, 0) / scores.length)
    : null
}

export function summarizePaymentsForMonth(
  payments: DashboardPayment[],
  monthStart: string,
): { count: number; total: number } {
  const currentMonth = payments.filter(
    (payment) =>
      payment.status === "valid" && (payment.paidAt ?? "").slice(0, 10) >= monthStart,
  )

  return {
    count: currentMonth.length,
    total: currentMonth.reduce((total, payment) => total + (Number(payment.amount) || 0), 0),
  }
}
