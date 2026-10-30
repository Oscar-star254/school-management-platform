import type { CollectionBeforeChangeHook, CollectionConfig } from 'payload'

import { FINANCE_MANAGERS, getUser, hasRole } from '../access'
import { deny } from '../access/academics'
import { financeOnly, financeOrFamily, never } from '../access/finance'
import { relId } from '../access/people'
import { auditAfterChange } from '../hooks/audit'

type Line = { description?: string; amount?: number }

/**
 * Invoices are never edited. To correct one, void it (with a reason) and issue a new invoice,
 * or add an adjustment. The invoice number and total are set by the system.
 */
const rules: CollectionBeforeChangeHook = async ({ data, originalDoc, operation, req }) => {
  const actor = getUser(req)
  if (!actor || !hasRole(actor, ...FINANCE_MANAGERS)) throw deny('Only the finance office can change fees.')

  if (operation === 'update') {
    const linesChanged = data.lines !== undefined && JSON.stringify(data.lines) !== JSON.stringify(originalDoc?.lines)
    const moved =
      (data.student !== undefined && relId(data.student) !== relId(originalDoc?.student)) ||
      (data.term !== undefined && relId(data.term) !== relId(originalDoc?.term))
    if (linesChanged || moved) {
      throw deny('Invoices cannot be edited. Void it and issue a new one, or add an adjustment.')
    }
    if (originalDoc?.status === 'void') throw deny('This invoice is already void.')
    if (data.status === 'void' && !String(data.voidReason ?? '').trim()) throw deny('Give a reason for voiding the invoice.')
    return data
  }

  const lines = (data.lines ?? []) as Line[]
  if (!lines.length) throw deny('Add at least one fee line.')
  if (lines.some((line) => !String(line.description ?? '').trim())) throw deny('Every fee line needs a description.')
  const total = lines.reduce((sum, line) => sum + (Number(line.amount) || 0), 0)
  if (total < 0) throw deny('An invoice total cannot be negative.')

  if (data.structure) {
    const existing = await req.payload.find({
      collection: 'invoices',
      where: {
        and: [
          { student: { equals: relId(data.student) } },
          { term: { equals: relId(data.term) } },
          { structure: { equals: relId(data.structure) } },
          { status: { equals: 'issued' } },
        ],
      },
      limit: 1,
      depth: 0,
      req,
    })
    if (existing.totalDocs > 0) throw deny('This learner already has an invoice for that fee structure.')
  }

  const last = await req.payload.find({ collection: 'invoices', sort: '-id', limit: 1, depth: 0, req })
  const previous = String(last.docs[0]?.number ?? '').match(/(\d+)$/)?.[1]
  const number = `INV-${String((previous ? parseInt(previous, 10) : 0) + 1).padStart(4, '0')}`
  return { ...data, number, total, status: 'issued', createdBy: actor.id }
}

export const Invoices: CollectionConfig = {
  slug: 'invoices',
  labels: { singular: 'Invoice', plural: 'Invoices' },
  admin: { useAsTitle: 'number', defaultColumns: ['number', 'student', 'term', 'total', 'status'], group: 'Finance' },
  access: {
    read: financeOrFamily([{ status: { equals: 'issued' } }]),
    create: financeOnly,
    update: financeOnly,
    delete: never,
  },
  hooks: { beforeChange: [rules], afterChange: [auditAfterChange('invoices', { trackValues: ['status'] })] },
  fields: [
    { name: 'number', type: 'text', unique: true, index: true, admin: { readOnly: true } },
    { name: 'student', type: 'relationship', relationTo: 'students', required: true, index: true },
    { name: 'term', type: 'relationship', relationTo: 'terms', required: true, index: true },
    { name: 'structure', type: 'relationship', relationTo: 'fee-structures' },
    {
      name: 'lines',
      type: 'array',
      required: true,
      fields: [
        { name: 'description', type: 'text', required: true },
        { name: 'amount', type: 'number', required: true, admin: { description: 'Use a negative amount for a discount.' } },
      ],
    },
    { name: 'total', type: 'number', admin: { readOnly: true } },
    {
      name: 'status',
      type: 'select',
      defaultValue: 'issued',
      index: true,
      options: [
        { label: 'Issued', value: 'issued' },
        { label: 'Void', value: 'void' },
      ],
    },
    { name: 'voidReason', type: 'text' },
    { name: 'createdBy', type: 'relationship', relationTo: 'users', admin: { readOnly: true } },
  ],
}