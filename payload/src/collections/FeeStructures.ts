import type { CollectionBeforeChangeHook, CollectionConfig } from 'payload'

import { getUser } from '../access'
import { deny } from '../access/academics'
import { financeOnly } from '../access/finance'
import { hasRole, FINANCE_MANAGERS } from '../access'
import { auditAfterChange } from '../hooks/audit'

const rules: CollectionBeforeChangeHook = ({ data, req }) => {
  const actor = getUser(req)
  if (!actor || !hasRole(actor, ...FINANCE_MANAGERS)) throw deny('Only the finance office can change fees.')
  const items = (data.items ?? []) as { amount?: number }[]
  if (!items.length) throw deny('Add at least one fee item.')
  if (items.some((item) => !(Number(item.amount) >= 0))) throw deny('Fee amounts cannot be negative.')
  return data
}

/** A template of fees for one class in one term. Invoices are created from it. */
export const FeeStructures: CollectionConfig = {
  slug: 'fee-structures',
  labels: { singular: 'Fee Structure', plural: 'Fee Structures' },
  admin: { useAsTitle: 'name', defaultColumns: ['name', 'term', 'class', 'isActive'], group: 'Finance' },
  access: { read: financeOnly, create: financeOnly, update: financeOnly, delete: financeOnly },
  hooks: { beforeChange: [rules], afterChange: [auditAfterChange('fee-structures')] },
  fields: [
    { name: 'name', type: 'text', required: true, admin: { description: 'For example: Grade 4 Term 1 fees' } },
    { name: 'term', type: 'relationship', relationTo: 'terms', required: true, index: true },
    { name: 'class', type: 'relationship', relationTo: 'classes', required: true, index: true },
    {
      name: 'items',
      type: 'array',
      required: true,
      fields: [
        { name: 'name', type: 'text', required: true },
        { name: 'amount', type: 'number', required: true, min: 0 },
      ],
    },
    { name: 'isActive', type: 'checkbox', defaultValue: true },
  ],
}