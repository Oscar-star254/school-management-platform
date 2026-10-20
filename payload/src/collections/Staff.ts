import type { CollectionConfig } from 'payload'

import { ADMIN_ROLES, adminsOnly } from '../access'
import { ownOrRoles } from '../access/people'
import { auditAfterChange, auditAfterDelete } from '../hooks/audit'

export const Staff: CollectionConfig = {
  slug: 'staff',
  labels: { singular: 'Staff Member', plural: 'Staff' },
  admin: {
    useAsTitle: 'staffNumber',
    defaultColumns: ['staffNumber', 'user', 'jobTitle', 'employmentType', 'isActive'],
    group: 'People',
  },
  access: {
    // Admins and the Academic Admin see everyone; staff see only their own profile.
    read: ownOrRoles('user', ...ADMIN_ROLES, 'academic_admin'),
    create: adminsOnly,
    update: adminsOnly,
    delete: adminsOnly,
  },
  hooks: {
    afterChange: [auditAfterChange('staff', { trackValues: ['isActive'] })],
    afterDelete: [auditAfterDelete('staff')],
  },
  fields: [
    {
      name: 'user',
      type: 'relationship',
      relationTo: 'users',
      required: true,
      unique: true,
      filterOptions: { role: { not_in: ['student', 'parent'] } },
    },
    { name: 'staffNumber', type: 'text', required: true, unique: true, index: true },
    { name: 'jobTitle', type: 'text' },
    { name: 'phone', type: 'text' },
    {
      name: 'employmentType',
      type: 'select',
      options: [
        { label: 'Permanent', value: 'permanent' },
        { label: 'Contract', value: 'contract' },
        { label: 'Part-time', value: 'part_time' },
        { label: 'Volunteer', value: 'volunteer' },
      ],
    },
    { name: 'employmentDate', type: 'date', admin: { date: { pickerAppearance: 'dayOnly' } } },
    {
      name: 'isActive',
      type: 'checkbox',
      defaultValue: true,
      admin: { description: 'Employment status. Login suspension is set on the user account.' },
    },
  ],
}