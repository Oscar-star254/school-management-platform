import type { CollectionBeforeChangeHook, CollectionConfig } from 'payload'

import { ACADEMIC_MANAGERS, getUser, hasRole, isRole } from '../access'

import { deny, getAssignedPairs, getOwnStudentIds } from '../access/academics'

import { anySignedIn, submissionsRead, submissionsUpdate } from '../access/communication'

import { relId } from '../access/people'

const rules: CollectionBeforeChangeHook = async ({ data, originalDoc, operation, req }) => {
  const actor = getUser(req)

  if (!actor) throw deny('Please sign in.')

  const merged = { ...originalDoc, ...data } as Record<string, unknown>

  const assignmentId = relId(merged.assignment)

  const studentId = relId(merged.student)

  if (!assignmentId || !studentId) throw deny('An assignment and a learner are required.')

  const assignment = (await req.payload.findByID({
    collection: 'assignments',

    id: assignmentId,

    depth: 0,

    req,
  })) as unknown as Record<string, unknown>

  const next = { ...data } as Record<string, unknown>

  if (hasRole(actor, 'student')) {
    const own = await getOwnStudentIds(req, actor)

    if (!own.includes(studentId)) throw deny('You can only hand in your own work.')

    if (assignment.status !== 'published') throw deny('This assignment is not open for work.')

    const student = await req.payload.findByID({
      collection: 'students',
      id: studentId,
      depth: 0,
      req,
    })

    if (relId(student.currentClass) !== relId(assignment.class))
      throw deny('This assignment is not for your class.')

    const due = assignment.dueDate ? new Date(assignment.dueDate as string).getTime() : Infinity

    const now = Date.now()

    if (now > due && !assignment.allowLate)
      throw deny('The deadline for this assignment has passed.')

    // On updates Payload passes the whole record, so compare with what was saved before.

    const changed = (a: unknown, b: unknown) => (a ?? null) !== (b ?? null)

    if (
      operation === 'update' &&
      (changed(data.marks, originalDoc?.marks) || changed(data.feedback, originalDoc?.feedback))
    ) {
      throw deny('Only your teacher can add marks and feedback.')
    }

    if (operation === 'update') {
      next.marks = originalDoc?.marks

      next.feedback = originalDoc?.feedback
    } else {
      delete next.marks

      delete next.feedback
    }

    next.submittedAt = new Date().toISOString()

    next.late = now > due
  } else if (!hasRole(actor, ...ACADEMIC_MANAGERS)) {
    if (operation === 'create') throw deny('Learners hand in their own work.')

    const pairs = await getAssignedPairs(req, actor)

    const teaches = pairs.some(
      (p) => p.classId === relId(assignment.class) && p.subjectId === relId(assignment.subject),
    )

    if (!teaches && relId(assignment.createdBy) !== actor.id)
      throw deny('You can only mark work for your own assignments.')

    if ('text' in data && data.text !== originalDoc?.text)
      throw deny('You cannot change a learner’s answer.')

    const max = typeof assignment.maxMarks === 'number' ? assignment.maxMarks : undefined

    if (
      typeof merged.marks === 'number' &&
      max !== undefined &&
      (merged.marks < 0 || merged.marks > max)
    ) {
      throw deny(`The mark must be between 0 and ${max}.`)
    }

    next.markedBy = actor.id
  }

  const and: Record<string, unknown>[] = [
    { assignment: { equals: assignmentId } },
    { student: { equals: studentId } },
  ]

  if (originalDoc?.id) and.push({ id: { not_equals: originalDoc.id } })

  const duplicate = await req.payload.find({
    collection: 'assignment-submissions',

    where: { and } as never,

    limit: 1,

    depth: 0,

    req,
  })

  if (duplicate.totalDocs > 0)
    throw deny('Work for this assignment has already been handed in. Replace it instead.')

  return next
}

export const AssignmentSubmissions: CollectionConfig = {
  slug: 'assignment-submissions',

  labels: { singular: 'Submission', plural: 'Submissions' },

  admin: {
    useAsTitle: 'id',
    defaultColumns: ['assignment', 'student', 'submittedAt', 'marks'],
    group: 'Academics',
  },

  access: {
    read: submissionsRead,

    create: anySignedIn,

    update: submissionsUpdate,

    delete: isRole(...ACADEMIC_MANAGERS),
  },

  hooks: { beforeChange: [rules] },

  fields: [
    {
      name: 'assignment',
      type: 'relationship',
      relationTo: 'assignments',
      required: true,
      index: true,
    },

    {
      name: 'student',
      type: 'relationship',
      relationTo: 'students',
      required: true,
      index: true,
    },

    { name: 'text', type: 'textarea' },

    { name: 'files', type: 'json', defaultValue: [] },

    { name: 'submittedAt', type: 'date', admin: { readOnly: true } },

    {
      name: 'late',
      type: 'checkbox',
      defaultValue: false,
      admin: { readOnly: true },
    },

    { name: 'marks', type: 'number', min: 0 },

    { name: 'feedback', type: 'textarea' },

    {
      name: 'markedBy',
      type: 'relationship',
      relationTo: 'users',
      admin: { readOnly: true },
    },
  ],
}
