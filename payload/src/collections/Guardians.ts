import type { CollectionConfig, FieldAccess } from 'payload'

import {
  ACADEMIC_MANAGERS,
  ADMIN_PANEL_ROLES,
  adminsOnly,
  getUser,
  hasRole,
  isRole,
} from '../access'
import { guardiansRead, guardiansUpdate, managersOnlyField } from '../access/people'
import { auditAfterChange, auditAfterDelete } from '../hooks/audit'

const adminsCanReadIdentification: FieldAccess = ({ req }) =>
  hasRole(getUser(req), ...ADMIN_PANEL_ROLES)

export const Guardians: CollectionConfig = {
  slug: 'guardians',
  labels: { singular: 'Parent/Guardian', plural: 'Parents/Guardians' },
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'identificationNumber', 'phone', 'email', 'user'],
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
    {
      name: 'identificationNumber',
      type: 'text',
      label: 'Parent/Guardian ID number',
      access: {
        read: adminsCanReadIdentification,
        create: managersOnlyField,
        update: managersOnlyField,
      },
      admin: {
        description: 'Private identification number; visible only to school administrators.',
      },
    },
    { name: 'phone', type: 'text' },
    { name: 'email', type: 'email' },
    { name: 'address', type: 'textarea' },
  ],
}
