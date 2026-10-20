import type { CollectionConfig } from 'payload'

import { academicManagersOnly, isAuthenticated } from '../access'

export const Subjects: CollectionConfig = {
  slug: 'subjects',
  labels: { singular: 'Subject', plural: 'Subjects' },
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'code', 'department', 'isActive'],
    group: 'Academics',
  },
  access: {
    read: isAuthenticated,
    create: academicManagersOnly,
    update: academicManagersOnly,
    delete: academicManagersOnly,
  },
  fields: [
    { name: 'name', type: 'text', required: true },
    {
      name: 'code',
      type: 'text',
      required: true,
      unique: true,
      hooks: {
        beforeValidate: [({ value }) => (typeof value === 'string' ? value.trim().toUpperCase() : value)],
      },
    },
    { name: 'department', type: 'text' },
    { name: 'isActive', type: 'checkbox', defaultValue: true },
  ],
}