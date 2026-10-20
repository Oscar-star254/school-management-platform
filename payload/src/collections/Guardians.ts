import type { CollectionConfig } from 'payload'

import { ACADEMIC_MANAGERS, adminsOnly, isRole } from '../access'
import { guardiansRead, guardiansUpdate, managersOnlyField } from '../access/people'
import { auditAfterChange, auditAfterDelete } from '../hooks/audit'

export const Guardians: CollectionConfig = {
  slug: 'guardians',
  labels: { singular: 'Parent/Guardian', plural: 'Parents/Guardians' },
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'phone', 'email', 'user'],
    group: 'People',
  },
  access: {
    read: guardiansRead,
    create: isRole(...ACADEMIC_MANAGERS),
    update: guardiansUpdate,
    delete: adminsOnly,
  },
  hooks: {
    afterChange: [auditAfterChange('guardians')],
    afterDelete: [auditAfterDelete('guardians')],
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
      access: { create: managersOnlyField, update: managersOnlyField },
    },
    {
      name: 'user',
      type: 'relationship',
      relationTo: 'users',
      unique: true,
      filterOptions: { role: { equals: 'parent' } },
      access: { create: managersOnlyField, update: managersOnlyField },
      admin: { description: 'Login account for this parent/guardian.' },
    },
    { name: 'phone', type: 'text' },
    { name: 'email', type: 'email' },
    { name: 'address', type: 'textarea' },
  ],
}