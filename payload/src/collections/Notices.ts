import type { CollectionBeforeChangeHook, CollectionConfig } from 'payload'

import { ACADEMIC_MANAGERS, getUser, hasRole } from '../access'
import { deny } from '../access/academics'
import { anySignedIn, noticesRead, noticesWrite } from '../access/communication'
import { getTaughtClassIds, relId } from '../access/people'
import { auditAfterChange } from '../hooks/audit'

const rules: CollectionBeforeChangeHook = async ({ data, originalDoc, operation, req }) => {
  const actor = getUser(req)
  if (!actor) throw deny('Please sign in.')

  const merged = { ...originalDoc, ...data } as Record<string, unknown>
  const next = { ...data } as Record<string, unknown>
  const audience = (merged.audience as string) ?? 'all'

  if (audience === 'role' && !merged.audienceRole) throw deny('Choose who should receive this notice.')
  if (audience === 'class' && !merged.audienceClass) throw deny('Choose the class that should receive this notice.')
  if (audience !== 'role') next.audienceRole = null
  if (audience !== 'class') next.audienceClass = null

  if (!hasRole(actor, ...ACADEMIC_MANAGERS)) {
    const classId = relId(merged.audienceClass)
    const taught = await getTaughtClassIds(req, actor)
    if (audience !== 'class' || !classId || !taught.includes(classId)) {
      throw deny('Teachers can only send notices to the classes they teach.')
    }
  }

  if (operation === 'create') next.createdBy = actor.id
  if (merged.status === 'published' && !originalDoc?.publishedAt) next.publishedAt = new Date().toISOString()
  return next
}

export const Notices: CollectionConfig = {
  slug: 'notices',
  labels: { singular: 'Notice', plural: 'Notices' },
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'audience', 'status', 'publishAt'],
    group: 'Communication',
  },
  access: {
    read: noticesRead,
    create: anySignedIn,
    update: noticesWrite,
    delete: noticesWrite,
  },
  hooks: {
    beforeChange: [rules],
    afterChange: [auditAfterChange('notices', { trackValues: ['status'] })],
  },
  fields: [
    { name: 'title', type: 'text', required: true },
    { name: 'body', type: 'textarea', required: true },
    {
      name: 'audience',
      type: 'select',
      required: true,
      defaultValue: 'all',
      options: [
        { label: 'Everyone', value: 'all' },
        { label: 'A group of people', value: 'role' },
        { label: 'One class', value: 'class' },
      ],
    },
    {
      name: 'audienceRole',
      type: 'select',
      options: [
        { label: 'All staff', value: 'staff' },
        { label: 'Teachers', value: 'teachers' },
        { label: 'Parents and guardians', value: 'parents' },
        { label: 'Learners', value: 'students' },
      ],
    },
    { name: 'audienceClass', type: 'relationship', relationTo: 'classes', index: true },
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
      name: 'publishAt',
      type: 'date',
      admin: { description: 'Leave empty to publish immediately. A future time schedules the notice.', date: { pickerAppearance: 'dayAndTime' } },
    },
    { name: 'publishedAt', type: 'date', admin: { readOnly: true } },
    { name: 'createdBy', type: 'relationship', relationTo: 'users', index: true, admin: { readOnly: true } },
  ],
}