import type { CollectionConfig } from 'payload'

import { academicManagersOnly, isAuthenticated } from '../access'

export const AcademicYears: CollectionConfig = {
  slug: 'academic-years',
  labels: { singular: 'Academic Year', plural: 'Academic Years' },
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'startDate', 'endDate', 'isCurrent'],
    group: 'Academics',
  },
  access: {
    read: isAuthenticated,
    create: academicManagersOnly,
    update: academicManagersOnly,
    delete: academicManagersOnly,
  },
  hooks: {
    // Only one academic year can be current.
    afterChange: [
      async ({ doc, req }) => {
        if (doc.isCurrent) {
          await req.payload.update({
            collection: 'academic-years',
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
    { name: 'name', type: 'text', required: true, unique: true, admin: { description: 'e.g. 2026' } },
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
  ],
}