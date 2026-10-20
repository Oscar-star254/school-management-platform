import type { CollectionConfig } from 'payload'

import { academicManagersOnly, isAuthenticated } from '../access'

export const Classes: CollectionConfig = {
  slug: 'classes',
  labels: { singular: 'Class', plural: 'Classes' },
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'academicYear', 'classTeacher', 'capacity'],
    group: 'Academics',
  },
  access: {
    read: isAuthenticated,
    create: academicManagersOnly,
    update: academicManagersOnly,
    delete: academicManagersOnly,
  },
  hooks: {
    // name is always "<grade> <stream>", e.g. "Grade 4 East"
    beforeValidate: [
      ({ data, originalDoc }) => {
        const merged = { ...originalDoc, ...data } as { grade?: unknown; stream?: unknown }
        const name = [merged.grade, merged.stream]
          .map((v) => (typeof v === 'string' ? v.trim() : ''))
          .filter(Boolean)
          .join(' ')
        return { ...data, name }
      },
    ],
  },
  fields: [
    { name: 'name', type: 'text', admin: { readOnly: true } },
    { name: 'grade', type: 'text', required: true, admin: { description: 'e.g. Grade 4' } },
    { name: 'stream', type: 'text', admin: { description: 'e.g. East (optional)' } },
    { name: 'academicYear', type: 'relationship', relationTo: 'academic-years', required: true, index: true },
    {
      name: 'classTeacher',
      type: 'relationship',
      relationTo: 'users',
      filterOptions: { role: { in: ['teacher', 'class_teacher'] } },
    },
    { name: 'capacity', type: 'number', min: 1 },
  ],
}