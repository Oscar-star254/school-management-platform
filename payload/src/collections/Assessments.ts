import type { CollectionBeforeChangeHook, CollectionConfig } from 'payload'

import { ACADEMIC_MANAGERS, getUser, hasRole } from '../access'
import {
  assessmentsDelete,
  assessmentsRead,
  assessmentsUpdate,
  deny,
  getAssignedPairs,
  staffCanCreate,
} from '../access/academics'
import { relId } from '../access/people'
import { auditAfterChange } from '../hooks/audit'

/**
 * Workflow: open (teacher enters marks) -> submitted -> approved -> published (visible to families).
 * Teachers may only move open -> submitted, and only for classes and learning areas they teach.
 * Academic admins and above can move an assessment between any of the stages.
 */
const rules: CollectionBeforeChangeHook = async ({ data, originalDoc, operation, req }) => {
  const actor = getUser(req)
  if (!actor) throw deny('Please sign in.')

  const merged = { ...originalDoc, ...data } as Record<string, unknown>
  const prevStatus = originalDoc?.status as string | undefined
  const nextStatus = operation === 'create' ? 'open' : ((merged.status as string) ?? 'open')
  const next = { ...data } as Record<string, unknown>
  if (operation === 'create') next.status = 'open'

  if (!hasRole(actor, ...ACADEMIC_MANAGERS)) {
    const pairs = await getAssignedPairs(req, actor)
    const classId = relId(merged.class)
    const subjectId = relId(merged.subject)
    if (!pairs.some((p) => p.classId === classId && p.subjectId === subjectId)) {
      throw deny('You can only manage assessments for classes and learning areas you teach.')
    }
    if (operation === 'update') {
      if (prevStatus !== 'open') throw deny('This assessment is no longer open for changes.')
      if (nextStatus !== 'open' && nextStatus !== 'submitted') {
        throw deny('Teachers can only submit results for approval.')
      }
    }
  } else {
    if (nextStatus === 'published' && prevStatus !== 'published') next.publishedAt = new Date().toISOString()
    if (nextStatus !== 'published' && prevStatus === 'published') next.publishedAt = null
    if (nextStatus !== 'open') next.rejectionNote = null
  }
  return next
}

export const Assessments: CollectionConfig = {
  slug: 'assessments',
  labels: { singular: 'Assessment', plural: 'Assessments' },
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'class', 'subject', 'term', 'status'],
    group: 'Academics',
  },
  access: {
    read: assessmentsRead,
    create: staffCanCreate,
    update: assessmentsUpdate,
    delete: assessmentsDelete,
  },
  hooks: {
    beforeChange: [rules],
    afterChange: [auditAfterChange('assessments', { trackValues: ['status'] })],
  },
  fields: [
    { name: 'name', type: 'text', required: true, admin: { description: 'For example: End of Term 1 exam' } },
    { name: 'term', type: 'relationship', relationTo: 'terms', required: true, index: true },
    { name: 'class', type: 'relationship', relationTo: 'classes', required: true, index: true },
    { name: 'subject', type: 'relationship', relationTo: 'subjects', required: true, index: true },
    { name: 'maxMarks', type: 'number', required: true, defaultValue: 100, min: 1 },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'open',
      index: true,
      options: [
        { label: 'Open for entry', value: 'open' },
        { label: 'Waiting for approval', value: 'submitted' },
        { label: 'Approved', value: 'approved' },
        { label: 'Published', value: 'published' },
      ],
    },
    { name: 'rejectionNote', type: 'text', admin: { description: 'Why results were returned to the teacher.' } },
    { name: 'publishedAt', type: 'date', admin: { readOnly: true } },
  ],
}