import type { CollectionBeforeChangeHook, CollectionConfig } from 'payload'

import { ACADEMIC_MANAGERS, getUser, hasRole } from '../access'

import { deny, getAssignedPairs } from '../access/academics'

import { anySignedIn, assignmentsRead, assignmentsWrite } from '../access/communication'

import { relId } from '../access/people'

import { auditAfterChange } from '../hooks/audit'

const rules: CollectionBeforeChangeHook = async ({ data, originalDoc, operation, req }) => {
  const actor = getUser(req)

  if (!actor) throw deny('Please sign in.')

  if (!hasRole(actor, ...ACADEMIC_MANAGERS)) {
    const merged = { ...originalDoc, ...data } as Record<string, unknown>

    const pairs = await getAssignedPairs(req, actor)

    const classId = relId(merged.class)

    const subjectId = relId(merged.subject)

    if (!pairs.some((p) => p.classId === classId && p.subjectId === subjectId)) {
      throw deny('You can only set work for classes and learning areas you teach.')
    }
  }

  return operation === 'create' ? { ...data, createdBy: actor.id } : data
}

export const Assignments: CollectionConfig = {
  slug: 'assignments',

  labels: { singular: 'Assignment', plural: 'Assignments' },

  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'class', 'subject', 'dueDate', 'status'],
    group: 'Academics',
  },

  access: {
    read: assignmentsRead,
    create: anySignedIn,
    update: assignmentsWrite,
    delete: assignmentsWrite,
  },

  hooks: {
    beforeChange: [rules],
    afterChange: [auditAfterChange('assignments', { trackValues: ['status'] })],
  },

  fields: [
    { name: 'title', type: 'text', required: true },

    { name: 'instructions', type: 'textarea' },

    { name: 'resources', type: 'json', defaultValue: [] },

    {
      name: 'class',
      type: 'relationship',
      relationTo: 'classes',
      required: true,
      index: true,
    },

    {
      name: 'subject',
      type: 'relationship',
      relationTo: 'subjects',
      required: true,
    },

    {
      name: 'dueDate',
      type: 'date',
      required: true,
      admin: { date: { pickerAppearance: 'dayAndTime' } },
    },

    { name: 'maxMarks', type: 'number', min: 1 },

    {
      name: 'allowLate',
      type: 'checkbox',
      defaultValue: false,
      admin: {
        description: 'Let learners hand in after the deadline (marked as late).',
      },
    },

    {
      name: 'status',

      type: 'select',

      required: true,

      defaultValue: 'draft',

      index: true,

      options: [
        { label: 'Draft', value: 'draft' },

        { label: 'Published', value: 'published' },

        { label: 'Archived', value: 'archived' },
      ],
    },

    {
      name: 'createdBy',
      type: 'relationship',
      relationTo: 'users',
      index: true,
      admin: { readOnly: true },
    },
  ],
}
