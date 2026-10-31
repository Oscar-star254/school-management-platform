import type { CollectionBeforeChangeHook, CollectionConfig } from 'payload'

import { deny } from '../access/academics'

import { timetableRead, timetableWrite } from '../access/communication'

import { relId } from '../access/people'

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/

const rules: CollectionBeforeChangeHook = async ({ data, originalDoc, req }) => {
  const m = { ...originalDoc, ...data } as Record<string, unknown>

  const classId = relId(m.class)

  const subjectId = relId(m.subject)

  const teacherId = relId(m.teacher)

  const start = String(m.startTime ?? '')

  const end = String(m.endTime ?? '')

  const day = String(m.dayOfWeek ?? '')

  if (!TIME.test(start) || !TIME.test(end)) throw deny('Enter times like 08:30.')

  if (end <= start) throw deny('A lesson must end after it starts.')

  const assigned = await req.payload.find({
    collection: 'teacher-assignments',

    where: {
      and: [
        { teacher: { equals: teacherId } },
        { class: { equals: classId } },
        { subject: { equals: subjectId } },
      ],
    },

    limit: 1,

    depth: 0,

    req,
  })

  if (assigned.totalDocs === 0) {
    throw deny(
      'Assign this teacher to that class and learning area first (Learning areas, then Who teaches what).',
    )
  }

  const and: Record<string, unknown>[] = [
    { dayOfWeek: { equals: day } },

    {
      or: [{ class: { equals: classId } }, { teacher: { equals: teacherId } }],
    },
  ]

  if (originalDoc?.id) and.push({ id: { not_equals: originalDoc.id } })

  const others = await req.payload.find({
    collection: 'timetable-slots',

    where: { and } as never,

    depth: 0,

    pagination: false,

    req,
  })

  for (const other of others.docs) {
    if (start < String(other.endTime) && String(other.startTime) < end) {
      const who = relId(other.teacher) === teacherId ? 'The teacher is' : 'The class is'

      throw deny(`${who} already booked from ${other.startTime} to ${other.endTime} on that day.`)
    }
  }

  return data
}

export const TimetableSlots: CollectionConfig = {
  slug: 'timetable-slots',

  labels: { singular: 'Lesson', plural: 'Timetable' },

  admin: {
    useAsTitle: 'startTime',
    defaultColumns: ['dayOfWeek', 'startTime', 'class', 'subject', 'teacher'],
    group: 'Academics',
  },

  access: {
    read: timetableRead,

    create: timetableWrite,

    update: timetableWrite,

    delete: timetableWrite,
  },

  hooks: { beforeChange: [rules] },

  fields: [
    {
      name: 'class',
      type: 'relationship',
      relationTo: 'classes',
      required: true,
      index: true,
    },

    {
      name: 'subject',
      type: 'relationship',
      relationTo: 'subjects',
      required: true,
    },

    {
      name: 'teacher',
      type: 'relationship',
      relationTo: 'users',
      required: true,
      index: true,
    },

    {
      name: 'dayOfWeek',

      type: 'select',

      required: true,

      index: true,

      options: [
        { label: 'Monday', value: 'mon' },

        { label: 'Tuesday', value: 'tue' },

        { label: 'Wednesday', value: 'wed' },

        { label: 'Thursday', value: 'thu' },

        { label: 'Friday', value: 'fri' },
      ],
    },

    {
      name: 'startTime',
      type: 'text',
      required: true,
      admin: { description: 'For example 08:30' },
    },

    {
      name: 'endTime',
      type: 'text',
      required: true,
      admin: { description: 'For example 09:10' },
    },

    { name: 'room', type: 'text' },
  ],
}
