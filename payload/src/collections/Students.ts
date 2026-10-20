import type { CollectionConfig } from 'payload'

import { ACADEMIC_MANAGERS, adminsOnly, isRole } from '../access'
import {
  canReadStudentHealth,
  canWriteStudentHealth,
  studentsRead,
} from '../access/people'
import { auditAfterChange, auditAfterDelete } from '../hooks/audit'

export const Students: CollectionConfig = {
  slug: 'students',
  labels: { singular: 'Student', plural: 'Students' },
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'admissionNumber', 'currentClass', 'status'],
    group: 'People',
  },
  access: {
    read: studentsRead,
    create: isRole(...ACADEMIC_MANAGERS),
    update: isRole(...ACADEMIC_MANAGERS),
    delete: adminsOnly,
  },
  hooks: {
    beforeValidate: [
      async ({ data, originalDoc, operation, req }) => {
        const next = { ...data } as Record<string, unknown>
        const merged = { ...originalDoc, ...data } as { firstName?: unknown; lastName?: unknown }
        next.name = [merged.firstName, merged.lastName]
          .map((v) => (typeof v === 'string' ? v.trim() : ''))
          .filter(Boolean)
          .join(' ')

        // Auto-generate the admission number when left blank: ADM-1001, ADM-1002, ...
        if (operation === 'create' && !next.admissionNumber) {
          const last = await req.payload.find({
            collection: 'students',
            sort: '-id',
            limit: 1,
            depth: 0,
            req,
          })
          const lastNumber = String(last.docs[0]?.admissionNumber ?? '').match(/(\d+)$/)?.[1]
          next.admissionNumber = `ADM-${(lastNumber ? parseInt(lastNumber, 10) : 1000) + 1}`
        }
        return next
      },
    ],
    afterChange: [auditAfterChange('students', { trackValues: ['status', 'currentClass'] })],
    afterDelete: [auditAfterDelete('students')],
  },
  fields: [
    {
      name: 'admissionNumber',
      type: 'text',
      unique: true,
      index: true,
      admin: { description: 'Leave blank to generate automatically (ADM-1001, ADM-1002, ...).' },
    },
    { name: 'firstName', type: 'text', required: true },
    { name: 'lastName', type: 'text', required: true },
    { name: 'name', type: 'text', admin: { readOnly: true } },
    {
      name: 'dateOfBirth',
      type: 'date',
      admin: { date: { pickerAppearance: 'dayOnly' } },
    },
    {
      name: 'gender',
      type: 'select',
      options: [
        { label: 'Female', value: 'female' },
        { label: 'Male', value: 'male' },
      ],
    },
    {
      name: 'admissionDate',
      type: 'date',
      admin: { date: { pickerAppearance: 'dayOnly' } },
    },
    { name: 'currentClass', type: 'relationship', relationTo: 'classes', index: true },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'active',
      index: true,
      options: [
        { label: 'Active', value: 'active' },
        { label: 'Transferred', value: 'transferred' },
        { label: 'Withdrawn', value: 'withdrawn' },
        { label: 'Completed', value: 'completed' },
      ],
    },
    {
      name: 'user',
      type: 'relationship',
      relationTo: 'users',
      unique: true,
      filterOptions: { role: { equals: 'student' } },
      admin: { description: 'Login account for this student (optional).' },
    },
    {
      name: 'health',
      type: 'group',
      label: 'Medical and emergency information',
      access: { read: canReadStudentHealth, update: canWriteStudentHealth, create: canWriteStudentHealth },
      fields: [
        { name: 'medicalNotes', type: 'textarea' },
        { name: 'emergencyContactName', type: 'text' },
        { name: 'emergencyContactPhone', type: 'text' },
      ],
    },
  ],
}