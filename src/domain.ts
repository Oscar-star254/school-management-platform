export type Band = "PRIMARY" | "JUNIOR"
export interface Level {
  code: string
  min: number
  max: number
  points: number
}

interface WeightedScore {
  score: number
  maxScore: number
  weight: number
}

export const LEVELS: Record<Band, Level[]> = {
  PRIMARY: [
    { code: "EE", min: 75, max: 100, points: 4 },
    { code: "ME", min: 41, max: 74, points: 3 },
    { code: "AE", min: 21, max: 40, points: 2 },
    { code: "BE", min: 0, max: 20, points: 1 },
  ],
  JUNIOR: [
    { code: "EE1", min: 90, max: 100, points: 8 },
    { code: "EE2", min: 75, max: 89, points: 7 },
    { code: "ME1", min: 58, max: 74, points: 6 },
    { code: "ME2", min: 41, max: 57, points: 5 },
    { code: "AE1", min: 31, max: 40, points: 4 },
    { code: "AE2", min: 21, max: 30, points: 3 },
    { code: "BE1", min: 11, max: 20, points: 2 },
    { code: "BE2", min: 0, max: 10, points: 1 },
  ],
}

export function performanceLevel(score: number, band: Band): Level {
  const rounded = Math.round(Math.max(0, Math.min(100, score)))
  return LEVELS[band].find(
    (level) => rounded >= level.min && rounded <= level.max,
  )!
}

export function weightedResult(items: WeightedScore[]) {
  const totalWeight = items.reduce((sum, item) => sum + item.weight, 0)
  if (!items.length || totalWeight <= 0) return 0
  return Math.round(
    items.reduce(
      (sum, item) => sum + (item.score / item.maxScore) * 100 * item.weight,
      0,
    ) / totalWeight,
  )
}

export function reportCompleteness(input: {
  requiredAreas: string[]
  completedAreas: string[]
  competencies: boolean
  values: boolean
  classComment: boolean
  headCommentRequired: boolean
  headComment: boolean
}) {
  const missing = input.requiredAreas.filter(
    (area) => !input.completedAreas.includes(area),
  )
  if (!input.competencies) missing.push("Core competencies")
  if (!input.values) missing.push("Values")
  if (!input.classComment) missing.push("Class teacher comment")
  if (input.headCommentRequired && !input.headComment)
    missing.push("Head teacher comment")
  return { complete: missing.length === 0, missing }
}

export function feeBalance(
  invoice: number,
  payments: number[],
  balanceForward = 0,
) {
  return Math.max(
    0,
    invoice +
      balanceForward -
      payments.reduce((sum, payment) => sum + payment, 0),
  )
}

export function resolveConflict<T extends {
  clientUpdatedAt: string
  actorId: string
},>(current: T, incoming: T, locked: boolean) {
  if (locked) return { accepted: false, reason: "TERM_LOCKED", value: current }
  const accepted =
    Date.parse(incoming.clientUpdatedAt) >= Date.parse(current.clientUpdatedAt)
  return {
    accepted,
    reason: accepted ? undefined : "STALE_VERSION",
    value: accepted ? incoming : current,
  }
}
