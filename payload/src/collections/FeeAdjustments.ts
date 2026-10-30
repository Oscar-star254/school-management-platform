import type { CollectionBeforeChangeHook, CollectionConfig } from 'payload'

import { FINANCE_MANAGERS, getUser, hasRole } from '../access'
import { deny } from '../access/academics'
import { financeOnly, financeOrFamily, never } from '../access/finance'
import { auditAfterChange } from '../hooks/audit'

const rules: CollectionBeforeChangeHook = ({ data, req }) => {
  const actor = getUser(req)
  if (!actor || !hasRole(actor, ...FINANCE_MANAGERS)) throw deny('Only the finance office can adjust fees.')
  if (!Number(data.amount)) throw deny('The adjustment amount cannot be zero.')
  if (!String(data.reason ?? '').trim()) throw deny('Give a reason for the adjustment.')
  return { ...data, createdBy: actor.id }
}

/** A signed correction to a learner's balance: a discount, waiver or extra charge. Cannot be edited. */
export const FeeAdjustments: CollectionConfig = {
  slug: 'fee-adjustments',
  labels: { singular: 'Fee Adjustment', plural: 'Fee Adjustments' },
  admin: { useAsTitle: 'reason', defaultColumns: ['student', 'amount', 'reason', 'date'], group: 'Finance' },
  access: { read: financeOrFamily(), create: financeOnly, update: never, delete: never },
  hooks: { beforeChange: [rules], afterChange: [auditAfterChange('fee-adjustments')] },
  fields: [
    { name: 'student', type: 'relationship', relationTo: 'students', required: true, index: true },
    { name: 'amount', type: 'number', required: true, admin: { description: 'Negative lowers the balance (a discount or waiver). Positive adds a charge.' } },
    { name: 'reason', type: 'text', required: true },
    { name: 'date', type: 'date', required: true, admin: { date: { pickerAppearance: 'dayOnly' } } },
    { name: 'createdBy', type: 'relationship', relationTo: 'users', admin: { readOnly: true } },
  ],
}