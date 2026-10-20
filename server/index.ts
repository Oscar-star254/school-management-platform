import Fastify from "fastify"
import { randomUUID } from "node:crypto"
import { z } from "zod"
import { performanceLevel } from "../src/domain"

const app = Fastify({ logger: true, bodyLimit: 5_000_000 })
const users = new Map([
  [
    "DEMO-1042",
    { password: "demo2026", role: "LEARNER", learnerId: "learner-1042" },
  ],
  ["t.wafula", { password: "demo2026", role: "TEACHER" }],
  ["admin", { password: "demo2026", role: "SUPER_ADMIN" }],
])
const applied = new Set<string>()
let syncSequence = 1000

app.get("/health", async () => ({
  status: "ok",
  database: "mock",
  redis: "mock",
}))

app.post("/auth/login", async (request, reply) => {
  const input = z
    .object({ username: z.string().min(3), password: z.string().min(4) })
    .safeParse(request.body)
  if (!input.success)
    return reply.code(400).send({ message: "Check your details and try again" })
  const user = users.get(input.data.username)
  if (!user || user.password !== input.data.password)
    return reply.code(401).send({ message: "Check your details and try again" })
  return {
    accessToken: `demo.${randomUUID()}`,
    refreshToken: randomUUID(),
    role: user.role,
    learnerId: user.learnerId,
  }
})

app.post("/sync/push", async (request, reply) => {
  const parsed = z
    .object({
      deviceId: z.string(),
      changes: z.array(
        z.object({
          id: z.string(),
          table: z.string(),
          op: z.enum(["CREATE", "UPDATE", "DELETE"]),
          payload: z.record(z.unknown()),
        }),
      ),
    })
    .safeParse(request.body)
  if (!parsed.success)
    return reply.code(400).send({ error: parsed.error.flatten() })
  const accepted = parsed.data.changes.filter((change) => {
    if (applied.has(change.id)) return false
    applied.add(change.id)
    syncSequence++
    return true
  })
  return {
    applied: accepted.map((change) => ({
      id: change.id,
      syncSeq: syncSequence,
    })),
    rejected: [],
    conflicts: [],
  }
})

app.get("/sync/pull", async (request) => {
  const query = z
    .object({
      cursor: z.coerce.number().default(0),
      limit: z.coerce.number().max(500).default(500),
    })
    .parse(request.query)
  return {
    changes: [],
    nextCursor: Math.max(query.cursor, syncSequence),
    hasMore: false,
  }
})

app.post("/payments/stk", async (request, reply) => {
  const input = z
    .object({
      learnerId: z.string(),
      phone: z.string().regex(/^254\d{9}$/),
      amount: z.number().positive(),
    })
    .safeParse(request.body)
  if (!input.success)
    return reply.code(400).send({ error: input.error.flatten() })
  return {
    checkoutRequestId: `MOCK-${randomUUID()}`,
    status: "PROCESSING",
    message: "Mock STK request accepted",
  }
})

app.post("/payments/callback", async (request) => {
  const input = z
    .object({
      checkoutRequestId: z.string(),
      receipt: z.string(),
      amount: z.number(),
    })
    .parse(request.body)
  return {
    accepted: true,
    idempotencyKey: `${input.checkoutRequestId}:${input.receipt}`,
  }
})

app.get("/reports/:learnerId/summary", async (request) => {
  const { learnerId } = z
    .object({ learnerId: z.string() })
    .parse(request.params)
  return {
    learnerId,
    term: "Term 2",
    result: 78,
    level: performanceLevel(78, "PRIMARY").code,
    status: "RELEASED",
  }
})

const port = Number(process.env.API_PORT || 3001)
app.listen({ port, host: "0.0.0.0" }).catch((error) => {
  app.log.error(error)
  process.exit(1)
})
