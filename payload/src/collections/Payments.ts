import type { CollectionBeforeChangeHook, CollectionConfig } from 'payload'

import { FINANCE_MANAGERS, getUser, hasRole } from '../access'
import { deny } from '../access/academics'
import { financeOnly, financeOrFamily, never } from '../access/finance'
import { relId } from '../access/people'
import { auditAfterChange } from '../hooks/audit'

/**
 * Payments are never edited or deleted. A mistake is reversed (with a reason), which keeps the
 * record and removes the amount from the learner's balance. Receipt numbers are set by the system.
 */
const rules: CollectionBeforeChangeHook = async ({ data, originalDoc, operation, req }) => {
  const actor = getUser(req)
  if (!actor || !hasRole(actor, ...FINANCE_MANAGERS)) throw deny('Only the finance office can record payments.')

  if (operation === 'update') {
    const changed =
      (data.amount !== undefined && Number(data.amount) !== Number(originalDoc?.amount)) ||
      (data.student !== undefined && relId(data.student) !== relId(originalDoc?.student)) ||
      (data.method !== undefined && data.method !== originalDoc?.method) ||
      (data.reference !== undefined && (data.reference ?? null) !== (originalDoc?.reference ?? null))
    if (changed) throw deny('Payments cannot be edited. Reverse it and record the correct one.')
    if (originalDoc?.status === 'reversed') throw deny('This payment is already reversed.')
    if (data.status === 'reversed' && !String(data.reversalReason ?? '').trim()) throw deny('Give a reason for reversing the payment.')
    return data
  }

  const amount = Number(data.amount)
  if (!(amount > 0)) throw deny('The amount must be more than zero.')
  const method = String(data.method ?? 'cash')
  const reference = String(data.reference ?? '').trim()
  if (method !== 'cash' && !reference) throw deny('Enter the reference (for example the M-Pesa code) for this payment.')

  if (reference) {
    const duplicate = await req.payload.find({
      collection: 'payments',
      where: { and: [{ method: { equals: method } }, { reference: { equals: reference } }, { status: { equals: 'valid' } }] },
      limit: 1,
      depth: 0,
      req,
    })
    if (duplicate.totalDocs > 0) throw deny('A payment with that reference has already been recorded.')
  }

  const last = await req.payload.find({ collection: 'payments', sort: '-id', limit: 1, depth: 0, req })
  const previous = String(last.docs[0]?.receiptNumber ?? '').match(/(\d+)$/)?.[1]
  const receiptNumber = `RCT-${String((previous ? parseInt(previous, 10) : 0) + 1).padStart(4, '0')}`
  return { ...data, receiptNumber, status: 'valid', recordedBy: actor.id }
}

export const Payments: CollectionConfig = {
  slug: 'payments',
  labels: { singular: 'Payment', plural: 'Payments' },
  admin: { useAsTitle: 'receiptNumber', defaultColumns: ['receiptNumber', 'student', 'amount', 'method', 'paidAt', 'status'], group: 'Finance' },
  access: { read: financeOrFamily(), create: financeOnly, update: financeOnly, delete: never },
  hooks: { beforeChange: [rules], afterChange: [auditAfterChange('payments', { trackValues: ['status'] })] },
  fields: [
    { name: 'receiptNumber', type: 'text', unique: true, index: true, admin: { readOnly: true } },
    { name: 'student', type: 'relationship', relationTo: 'students', required: true, index: true },
    { name: 'amount', type: 'number', required: true, min: 0.01 },
    {
      name: 'method',
      type: 'select',
      required: true,
      defaultValue: 'cash',
      options: [
        { label: 'Cash', value: 'cash' },
        { label: 'M-Pesa', value: 'mpesa' },
        { label: 'Bank', value: 'bank' },
        { label: 'Cheque', value: 'cheque' },
        { label: 'Other', value: 'other' },
      ],
    },
    { name: 'reference', type: 'text', index: true },
    { name: 'paidAt', type: 'date', required: true, admin: { date: { pickerAppearance: 'dayOnly' } } },
    { name: 'note', type: 'text' },
    {
      name: 'status',
      type: 'select',
      defaultValue: 'valid',
      index: true,
      options: [
        { label: 'Valid', value: 'valid' },
        { label: 'Reversed', value: 'reversed' },
      ],
    },
    { name: 'reversalReason', type: 'text' },
    { name: 'recordedBy', type: 'relationship', relationTo: 'users', admin: { readOnly: true } },
  ],
}