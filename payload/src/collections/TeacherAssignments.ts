import { APIError } from 'payload'
import type { CollectionConfig } from 'payload'

import { ACADEMIC_MANAGERS, isRole } from '../access'
import { relId, teacherAssignmentsRead } from '../access/people'
import { auditAfterChange, auditAfterDelete } from '../hooks/audit'

/** Which teacher teaches which subject in which class. Drives teacher data access. */
export const TeacherAssignments: CollectionConfig = {
  slug: 'teacher-assignments',
  labels: { singular: 'Teacher Assignment', plural: 'Teacher Assignments' },
  admin: {
    useAsTitle: 'id',
    defaultColumns: ['teacher', 'class', 'subject', 'academicYear'],
    group: 'Academics',
  },
  access: {
    read: teacherAssignmentsRead,
    create: isRole(...ACADEMIC_MANAGERS),
    update: isRole(...ACADEMIC_MANAGERS),
    delete: isRole(...ACADEMIC_MANAGERS),
  },
  hooks: {
    beforeChange: [
      async ({ data, originalDoc, req }) => {
        const merged = { ...originalDoc, ...data } as Record<string, unknown>
        const and: Record<string, unknown>[] = ['teacher', 'class', 'subject', 'academicYear'].map(
          (field) => ({ [field]: { equals: relId(merged[field]) } }),
        )
        if (originalDoc?.id) and.push({ id: { not_equals: originalDoc.id } })
        const existing = await req.payload.find({
          collection: 'teacher-assignments',
          where: { and } as never,
          limit: 1,
          depth: 0,
          req,
        })
        if (existing.totalDocs > 0) {
          throw new APIError(
            'This teacher is already assigned to that class and subject for the year.',
            400,
            null,
            true,
          )
        }
        return data
      },
    ],
    afterChange: [auditAfterChange('teacher-assignments')],
    afterDelete: [auditAfterDelete('teacher-assignments')],
  },
  fields: [
    {
      name: 'teacher',
      type: 'relationship',
      relationTo: 'users',
      required: true,
      index: true,
      filterOptions: { role: { in: ['teacher', 'class_teacher'] } },
    },
    { name: 'class', type: 'relationship', relationTo: 'classes', required: true, index: true },
    { name: 'subject', type: 'relationship', relationTo: 'subjects', required: true },
    { name: 'academicYear', type: 'relationship', relationTo: 'academic-years', required: true },
  ],
}