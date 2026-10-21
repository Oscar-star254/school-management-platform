import type { CollectionBeforeChangeHook, CollectionConfig } from 'payload'

import { ACADEMIC_MANAGERS, getUser, hasRole, isRole } from '../access'
import { attendanceRead, attendanceWrite, deny, staffCanCreate } from '../access/academics'
import { getTaughtClassIds, relId } from '../access/people'

const rules: CollectionBeforeChangeHook = async ({ data, originalDoc, operation, req }) => {
  const actor = getUser(req)
  if (!actor) throw deny('Please sign in.')

  const merged = { ...originalDoc, ...data } as Record<string, unknown>
  const classId = relId(merged.class)
  const studentId = relId(merged.student)
  if (!classId || !studentId || !merged.date) throw deny('Learner, class and date are required.')
  const dayIso = new Date(merged.date as string).toISOString()

  if (!hasRole(actor, ...ACADEMIC_MANAGERS)) {
    const taught = await getTaughtClassIds(req, actor)
    if (!taught.includes(classId)) throw deny('You can only take attendance for your own classes.')
  }

  const student = await req.payload.findByID({ collection: 'students', id: studentId, depth: 0, req })
  if (relId(student.currentClass) !== classId) throw deny('That learner is not in this class.')

  const locked = await req.payload.find({
    collection: 'terms',
    where: {
      and: [
        { isLocked: { equals: true } },
        { startDate: { less_than_equal: dayIso } },
        { endDate: { greater_than_equal: dayIso } },
      ],
    },
    limit: 1,
    depth: 0,
    req,
  })
  if (locked.totalDocs > 0) throw deny('That term is locked. Attendance can no longer be changed.')

  const and: Record<string, unknown>[] = [
    { student: { equals: studentId } },
    { date: { equals: dayIso } },
  ]
  if (originalDoc?.id) and.push({ id: { not_equals: originalDoc.id } })
  const duplicate = await req.payload.find({
    collection: 'attendance',
    where: { and } as never,
    limit: 1,
    depth: 0,
    req,
  })
  if (duplicate.totalDocs > 0) throw deny('Attendance for this learner on this date is already recorded.')

  return operation === 'create' ? { ...data, markedBy: actor.id } : data
}

export const Attendance: CollectionConfig = {
  slug: 'attendance',
  labels: { singular: 'Attendance Record', plural: 'Attendance' },
  admin: {
    useAsTitle: 'status',
    defaultColumns: ['date', 'student', 'class', 'status'],
    group: 'Academics',
  },
  access: {
    read: attendanceRead,
    create: staffCanCreate,
    update: attendanceWrite,
    delete: isRole(...ACADEMIC_MANAGERS),
  },
  hooks: { beforeChange: [rules] },
  fields: [
    { name: 'student', type: 'relationship', relationTo: 'students', required: true, index: true },
    { name: 'class', type: 'relationship', relationTo: 'classes', required: true, index: true },
    {
      name: 'date',
      type: 'date',
      required: true,
      index: true,
      admin: { date: { pickerAppearance: 'dayOnly' } },
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'present',
      options: [
        { label: 'Present', value: 'present' },
        { label: 'Absent', value: 'absent' },
        { label: 'Late', value: 'late' },
        { label: 'Excused', value: 'excused' },
      ],
    },
    { name: 'note', type: 'text' },
    { name: 'markedBy', type: 'relationship', relationTo: 'users', admin: { readOnly: true } },
  ],
}