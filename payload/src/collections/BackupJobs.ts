import type { CollectionConfig } from 'payload'

import { ADMIN_ROLES, isRole } from '../access'

export const BackupJobs: CollectionConfig = {
  slug: 'backup-jobs',
  labels: { singular: 'Backup Job', plural: 'Backup Jobs' },
  admin: {
    useAsTitle: 'scheduleKey',
    defaultColumns: ['operation', 'trigger', 'status', 'fileName', 'sizeBytes', 'createdAt'],
    group: 'System',
  },
  access: {
    read: isRole(...ADMIN_ROLES),
    create: () => false,
    update: () => false,
    delete: () => false,
  },
  fields: [
    { name: 'scheduleKey', type: 'text', required: true, unique: true, index: true },
    {
      name: 'operation',
      type: 'select',
      required: true,
      options: [
        { label: 'Backup', value: 'backup' },
        { label: 'Restore', value: 'restore' },
      ],
      index: true,
    },
    {
      name: 'trigger',
      type: 'select',
      required: true,
      options: [
        { label: 'Daily schedule', value: 'daily' },
        { label: 'Manual', value: 'manual' },
        { label: 'Restore request', value: 'restore' },
      ],
      index: true,
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'queued',
      options: [
        { label: 'Queued', value: 'queued' },
        { label: 'Running', value: 'running' },
        { label: 'Succeeded', value: 'succeeded' },
        { label: 'Failed', value: 'failed' },
        { label: 'Expired', value: 'expired' },
      ],
      index: true,
    },
    { name: 'scheduledDate', type: 'text', index: true },
    { name: 'fileName', type: 'text' },
    { name: 'objectKey', type: 'text' },
    { name: 'sizeBytes', type: 'number' },
    { name: 'sha256', type: 'text' },
    { name: 'error', type: 'textarea' },
    { name: 'startedAt', type: 'date' },
    { name: 'finishedAt', type: 'date' },
    { name: 'requestedBy', type: 'relationship', relationTo: 'users', index: true },
    { name: 'sourceBackupId', type: 'number', index: true },
  ],
}
