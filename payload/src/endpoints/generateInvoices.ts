import { commitTransaction, initTransaction, killTransaction } from 'payload'

import type { Endpoint } from 'payload'

import { FINANCE_MANAGERS, getUser, hasRole } from '../access'

import { relId } from '../access/people'

const fail = (status: number, message: string) =>
  Response.json({ errors: [{ message }] }, { status })

/**
 * Creates an invoice for every active learner in the structure's class, using the structure's items.
 * Learners who already have an invoice from this structure are skipped, so it is safe to run twice.
 */

export const generateInvoices: Endpoint = {
  path: '/generate-invoices',

  method: 'post',

  handler: async (req) => {
    const actor = getUser(req)

    if (!actor || !hasRole(actor, ...FINANCE_MANAGERS))
      return fail(403, 'Only the finance office can create invoices.')

    let structureId: number | undefined

    try {
      structureId = (
        (await req.json?.()) as
          | {
              structureId?: number
            }
          | undefined
      )?.structureId
    } catch {
      return fail(400, 'The request could not be read.')
    }

    if (!structureId) return fail(400, 'Choose a fee structure.')

    const shouldCommit = await initTransaction(req)

    try {
      const structure = await req.payload.findByID({
        collection: 'fee-structures',
        id: structureId,
        depth: 0,
        req,
      })

      if (!structure.isActive) throw new Error('That fee structure is switched off.')

      const classId = relId(structure.class)

      const termId = relId(structure.term)

      if (!classId || !termId) throw new Error('The fee structure needs a class and a term.')

      const students = await req.payload.find({
        collection: 'students',

        where: {
          and: [{ currentClass: { equals: classId } }, { status: { equals: 'active' } }],
        },

        sort: 'name',

        depth: 0,

        pagination: false,

        req,
      })

      const studentIds = students.docs.map((student) => student.id)

      const [invoices, payments, adjustments] = studentIds.length
        ? await Promise.all([
            req.payload.find({
              collection: 'invoices',

              where: {
                and: [
                  { student: { in: studentIds } },
                  { term: { not_equals: termId } },
                  { status: { equals: 'issued' } },
                ],
              },

              limit: 10000,

              depth: 0,

              req,
            }),

            req.payload.find({
              collection: 'payments',

              where: {
                and: [{ student: { in: studentIds } }, { status: { equals: 'valid' } }],
              },

              limit: 10000,

              depth: 0,

              req,
            }),

            req.payload.find({
              collection: 'fee-adjustments',

              where: { student: { in: studentIds } },

              limit: 10000,

              depth: 0,

              req,
            }),
          ])
        : [{ docs: [] }, { docs: [] }, { docs: [] }]

      const cents = (value: number) => Math.round(value * 100)

      const priorBalance = new Map<number, number>()

      for (const student of students.docs) {
        const billed = invoices.docs

          .filter((invoice) => relId(invoice.student) === student.id)

          .reduce(
            (sum, invoice) =>
              sum + cents(Number(invoice.total ?? 0) - Number(invoice.carryForward ?? 0)),
            0,
          )

        const paid = payments.docs

          .filter((payment) => relId(payment.student) === student.id)

          .reduce((sum, payment) => sum + cents(Number(payment.amount ?? 0)), 0)

        const adjusted = adjustments.docs

          .filter((adjustment) => relId(adjustment.student) === student.id)

          .reduce((sum, adjustment) => sum + cents(Number(adjustment.amount ?? 0)), 0)

        priorBalance.set(student.id, Math.max(0, billed + adjusted - paid) / 100)
      }

      let created = 0

      let skipped = 0

      for (const student of students.docs) {
        const existing = await req.payload.find({
          collection: 'invoices',

          where: {
            and: [
              { student: { equals: student.id } },

              { structure: { equals: structure.id } },

              { status: { equals: 'issued' } },
            ],
          },

          limit: 1,

          depth: 0,

          req,
        })

        if (existing.totalDocs > 0) {
          skipped++

          continue
        }

        const carryForward = priorBalance.get(student.id) ?? 0

        const lines = (structure.items ?? []).map((item) => ({
          description: item.name,
          amount: item.amount,
        }))

        if (carryForward > 0)
          lines.push({
            description: 'Previous term balance',
            amount: carryForward,
          })

        await req.payload.create({
          collection: 'invoices',

          data: {
            student: student.id,

            term: termId,

            structure: structure.id,

            lines,

            carryForward,
          },

          req,
        })

        created++
      }

      if (shouldCommit) await commitTransaction(req)

      return Response.json({ created, skipped })
    } catch (error) {
      if (shouldCommit) await killTransaction(req)

      return fail(
        400,
        error instanceof Error ? error.message : 'The invoices could not be created.',
      )
    }
  },
}
