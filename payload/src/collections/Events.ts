import type { CollectionConfig } from 'payload'

import { ACADEMIC_MANAGERS, isRole } from '../access'

import { eventsRead } from '../access/communication'

export const Events: CollectionConfig = {
  slug: 'events',

  labels: { singular: 'School Event', plural: 'School Events' },

  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'type', 'startDate', 'class'],
    group: 'Academics',
  },

  access: {
    read: eventsRead,

    create: isRole(...ACADEMIC_MANAGERS),

    update: isRole(...ACADEMIC_MANAGERS),

    delete: isRole(...ACADEMIC_MANAGERS),
  },

  fields: [
    { name: 'title', type: 'text', required: true },

    {
      name: 'type',

      type: 'select',

      required: true,

      defaultValue: 'event',

      options: [
        { label: 'School event', value: 'event' },

        { label: 'Examination', value: 'exam' },

        { label: 'Holiday', value: 'holiday' },

        { label: 'Deadline', value: 'deadline' },
      ],
    },

    {
      name: 'startDate',
      type: 'date',
      required: true,
      index: true,
      admin: { date: { pickerAppearance: 'dayOnly' } },
    },

    {
      name: 'endDate',

      type: 'date',

      admin: { date: { pickerAppearance: 'dayOnly' } },

      validate: (value, { siblingData }) => {
        const start = (siblingData as { startDate?: string }).startDate

        if (value && start && new Date(value) < new Date(start))
          return 'The end date cannot be before the start date.'

        return true
      },
    },

    {
      name: 'class',
      type: 'relationship',
      relationTo: 'classes',
      admin: { description: 'Leave empty for the whole school.' },
    },

    { name: 'description', type: 'textarea' },

    {
      name: 'location',
      type: 'text',
      admin: { description: 'Venue or map-friendly location.' },
    },

    {
      name: 'posterUrl',
      type: 'text',
      admin: { description: 'Upload a poster in the school Events page.' },
    },

    { name: 'posterAlt', type: 'text' },
  ],
}
