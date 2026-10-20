import type { CollectionConfig } from 'payload'

import { academicManagersOnly, isAuthenticated } from '../access'

export const Terms: CollectionConfig = {
  slug: 'terms',
  labels: { singular: 'Term', plural: 'Terms' },
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'academicYear', 'startDate', 'endDate', 'isCurrent', 'isLocked'],
    group: 'Academics',
  },
  access: {
    read: isAuthenticated,
    create: academicManagersOnly,
    update: academicManagersOnly,
    delete: academicManagersOnly,
  },
  hooks: {
    // Only one term can be current.
    afterChange: [
      async ({ doc, req }) => {
        if (doc.isCurrent) {
          await req.payload.update({
            collection: 'terms',
            where: {
              and: [{ isCurrent: { equals: true } }, { id: { not_equals: doc.id } }],
            },
            data: { isCurrent: false },
            req,
          })
        }
        return doc
      },
    ],
  },
  fields: [
    { name: 'academicYear', type: 'relationship', relationTo: 'academic-years', required: true, index: true },
    { name: 'name', type: 'text', required: true, admin: { description: 'e.g. Term 1' } },
    { name: 'startDate', type: 'date', required: true },
    {
      name: 'endDate',
      type: 'date',
      required: true,
      validate: (value, { siblingData }) => {
        const start = (siblingData as { startDate?: string }).startDate
        if (value && start && new Date(value) <= new Date(start)) {
          return 'End date must be after the start date.'
        }
        return true
      },
    },
    { name: 'isCurrent', type: 'checkbox', defaultValue: false, index: true },
    {
      name: 'isLocked',
      type: 'checkbox',
      defaultValue: false,
      admin: { description: 'Locked terms reject changes to marks, attendance and fees.' },
    },
  ],
}