import type { GlobalConfig } from 'payload'

import { adminsOnly } from '../access'

/** School profile and report settings. Anyone may read the public parts (the name shows on the sign-in page). */

export const SchoolSettings: GlobalConfig = {
  slug: 'school-settings',

  label: 'School Settings',

  access: { read: () => true, update: adminsOnly },

  hooks: {
    afterChange: [
      async ({ doc, req }) => {
        await req.payload.create({
          collection: 'audit-logs',

          data: {
            action: 'update',

            targetCollection: 'school-settings',

            targetId: 'settings',

            actor: req.user?.id ?? null,

            summary: 'update school settings',

            changedFields: [],
          },

          req,

          context: { skipAudit: true },
        })

        return doc
      },
    ],
  },

  fields: [
    {
      name: 'schoolName',
      type: 'text',
      required: true,
      defaultValue: 'Smart Schools Kindergarten',
    },

    { name: 'motto', type: 'text' },

    {
      name: 'primaryColor',

      type: 'text',

      defaultValue: '#3478c8',

      validate: (value: unknown) =>
        !value ||
        (typeof value === 'string' && /^#[0-9a-fA-F]{6}$/.test(value)) ||
        'Use a six-digit hex color such as #3478c8.',
    },

    {
      name: 'schoolBadgeUrl',
      type: 'text',
      admin: { description: 'Upload the badge in the app Settings page.' },
    },

    {
      name: 'schoolPhotoUrl',
      type: 'text',
      admin: { description: 'Upload a school photo in the app Settings page.' },
    },

    { name: 'phone', type: 'text' },

    { name: 'email', type: 'email' },

    { name: 'address', type: 'textarea' },

    {
      name: 'principalName',
      type: 'text',
      admin: { description: 'Shown on report forms.' },
    },

    {
      name: 'reportFooter',
      type: 'textarea',
      admin: {
        description: 'A line printed at the bottom of every report form.',
      },
    },

    {
      name: 'reportTemplate',

      type: 'select',

      defaultValue: 'classic',

      options: [
        { label: 'Classic school report', value: 'classic' },

        { label: 'Modern blue report', value: 'modern' },
      ],
    },

    {
      name: 'invoiceTemplate',

      type: 'select',

      defaultValue: 'classic',

      options: [
        { label: 'Classic school invoice', value: 'classic' },

        { label: 'Modern blue invoice', value: 'modern' },
      ],
    },

    {
      name: 'invoiceFooter',
      type: 'textarea',
      admin: { description: 'Payment instructions printed on invoices.' },
    },

    {
      name: 'gradeBands',

      type: 'array',

      label: 'Grading levels',

      admin: {
        description: 'A result at or above the minimum percentage earns that level. Highest first.',
      },

      defaultValue: [
        { label: 'EE', minPercent: 75, remark: 'Exceeds expectations' },

        { label: 'ME', minPercent: 41, remark: 'Meets expectations' },

        { label: 'AE', minPercent: 21, remark: 'Approaches expectations' },

        { label: 'BE', minPercent: 0, remark: 'Needs support' },
      ],

      fields: [
        { name: 'label', type: 'text', required: true },

        {
          name: 'minPercent',
          type: 'number',
          required: true,
          min: 0,
          max: 100,
        },

        { name: 'remark', type: 'text' },
      ],
    },
  ],
}
