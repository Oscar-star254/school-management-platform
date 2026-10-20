import type { CollectionConfig } from 'payload'

import { ADMIN_ROLES, isRole } from '../access'

/** Append-only: records are written by hooks (local API); nobody can edit or delete them. */
export const AuditLogs: CollectionConfig = {
  slug: 'audit-logs',
  labels: { singular: 'Audit Log', plural: 'Audit Logs' },
  admin: {
    useAsTitle: 'summary',
    defaultColumns: ['createdAt', 'actor', 'action', 'targetCollection', 'summary'],
    group: 'System',
  },
  access: {
    read: isRole(...ADMIN_ROLES),
    create: () => false,
    update: () => false,
    delete: () => false,
  },
  timestamps: true,
  fields: [
    {
      name: 'action',
      type: 'select',
      required: true,
      options: [
        { label: 'Create', value: 'create' },
        { label: 'Update', value: 'update' },
        { label: 'Delete', value: 'delete' },
      ],
    },
    { name: 'targetCollection', type: 'text', required: true, index: true },
    { name: 'targetId', type: 'text', required: true, index: true },
    { name: 'actor', type: 'relationship', relationTo: 'users', index: true },
    { name: 'summary', type: 'text' },
    { name: 'changedFields', type: 'json' },
  ],
}