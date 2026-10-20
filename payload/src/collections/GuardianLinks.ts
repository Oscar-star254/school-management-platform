import { APIError } from 'payload'
import type { CollectionConfig } from 'payload'

import { ACADEMIC_MANAGERS, isRole } from '../access'
import { guardianLinksRead, relId } from '../access/people'
import { auditAfterChange, auditAfterDelete } from '../hooks/audit'

/** Connects a parent/guardian to a student. Parents only ever see their own links. */
export const GuardianLinks: CollectionConfig = {
  slug: 'guardian-links',
  labels: { singular: 'Guardian Link', plural: 'Guardian Links' },
  admin: {
    useAsTitle: 'relationship',
    defaultColumns: ['guardian', 'student', 'relationship', 'isPrimary'],
    group: 'People',
  },
  access: {
    read: guardianLinksRead,
    create: isRole(...ACADEMIC_MANAGERS),
    update: isRole(...ACADEMIC_MANAGERS),
    delete: isRole(...ACADEMIC_MANAGERS),
  },
  hooks: {
    beforeChange: [
      async ({ data, originalDoc, req }) => {
        const merged = { ...originalDoc, ...data } as { guardian?: unknown; student?: unknown }
        const and: Record<string, unknown>[] = [
          { guardian: { equals: relId(merged.guardian) } },
          { student: { equals: relId(merged.student) } },
        ]
        if (originalDoc?.id) and.push({ id: { not_equals: originalDoc.id } })
        const existing = await req.payload.find({
          collection: 'guardian-links',
          where: { and } as never,
          limit: 1,
          depth: 0,
          req,
        })
        if (existing.totalDocs > 0) {
          throw new APIError('This guardian is already linked to that student.', 400, null, true)
        }
        return data
      },
    ],
    afterChange: [auditAfterChange('guardian-links')],
    afterDelete: [auditAfterDelete('guardian-links')],
  },
  fields: [
    { name: 'guardian', type: 'relationship', relationTo: 'guardians', required: true, index: true },
    { name: 'student', type: 'relationship', relationTo: 'students', required: true, index: true },
    {
      name: 'relationship',
      type: 'select',
      required: true,
      defaultValue: 'guardian',
      options: [
        { label: 'Mother', value: 'mother' },
        { label: 'Father', value: 'father' },
        { label: 'Guardian', value: 'guardian' },
        { label: 'Other', value: 'other' },
      ],
    },
    { name: 'isPrimary', type: 'checkbox', defaultValue: false },
  ],
}