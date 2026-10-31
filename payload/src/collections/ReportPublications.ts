import type { CollectionConfig, Where } from 'payload'

import { ACADEMIC_MANAGERS, getUser, hasRole } from '../access'

import { deny, getChildStudentIds } from '../access/academics'

import { auditAfterChange } from '../hooks/audit'

export const ReportPublications: CollectionConfig = {
  slug: 'report-publications',

  labels: { singular: 'Published Report', plural: 'Published Reports' },

  admin: {
    useAsTitle: 'id',
    defaultColumns: ['student', 'class', 'term', 'publishedAt'],
    group: 'Academics',
  },

  access: {
    read: async ({ req }): Promise<boolean | Where> => {
      const user = getUser(req)

      if (!user) return false

      if (hasRole(user, ...ACADEMIC_MANAGERS)) return true

      if (hasRole(user, 'student', 'parent')) {
        const ids = await getChildStudentIds(req, user)

        return ids.length ? { student: { in: ids } } : { id: { equals: 0 } }
      }

      return false
    },

    create: () => false,

    update: () => false,

    delete: ({ req }) => hasRole(getUser(req), ...ACADEMIC_MANAGERS),
  },

  hooks: {
    afterChange: [auditAfterChange('report-publications')],

    beforeChange: [
      ({ req }) => {
        if (!hasRole(getUser(req), ...ACADEMIC_MANAGERS))
          throw deny('Only academic administrators can publish reports.')
      },
    ],
  },

  fields: [
    {
      name: 'student',
      type: 'relationship',
      relationTo: 'students',
      required: true,
      index: true,
    },

    {
      name: 'class',
      type: 'relationship',
      relationTo: 'classes',
      required: true,
      index: true,
    },

    {
      name: 'term',
      type: 'relationship',
      relationTo: 'terms',
      required: true,
      index: true,
    },

    {
      name: 'publishedBy',
      type: 'relationship',
      relationTo: 'users',
      admin: { readOnly: true },
    },

    {
      name: 'publishedAt',
      type: 'date',
      required: true,
      defaultValue: () => new Date().toISOString(),
    },
  ],

  indexes: [{ fields: ['student', 'term'], unique: true }],
}
