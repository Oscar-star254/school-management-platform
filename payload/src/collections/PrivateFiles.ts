import type { Access, CollectionBeforeChangeHook, CollectionConfig, Where } from 'payload'

import { ACADEMIC_MANAGERS, getUser, hasRole, TEACHING_ROLES } from '../access'

import { deny, getChildClassIds, getChildStudentIds } from '../access/academics'

import { getTeacherAssignmentIds } from '../access/communication'

import { relId } from '../access/people'

const fileRead: Access = async ({ req }): Promise<boolean | Where> => {
  const user = getUser(req)

  if (!user) return false

  if (hasRole(user, ...ACADEMIC_MANAGERS)) return true

  if (hasRole(user, ...TEACHING_ROLES)) {
    const assignmentIds = await getTeacherAssignmentIds(req, user)

    return assignmentIds.length ? { assignment: { in: assignmentIds } } : { id: { equals: 0 } }
  }

  if (hasRole(user, 'student', 'parent')) {
    const [studentIds, classIds] = await Promise.all([
      getChildStudentIds(req, user),
      getChildClassIds(req, user),
    ])

    const clauses: Where[] = []

    if (studentIds.length) clauses.push({ student: { in: studentIds } })

    if (classIds.length) {
      const assignments = await req.payload.find({
        collection: 'assignments',

        where: {
          and: [{ class: { in: classIds } }, { status: { equals: 'published' } }],
        },

        depth: 0,

        pagination: false,

        req,
      })

      if (assignments.docs.length) {
        clauses.push({
          and: [
            {
              assignment: {
                in: assignments.docs.map((assignment) => assignment.id),
              },
            },

            { student: { exists: false } },
          ],
        })
      }
    }

    return clauses.length ? { or: clauses } : { id: { equals: 0 } }
  }

  return false
}

const validateUpload: CollectionBeforeChangeHook = async ({ data, req }) => {
  const user = getUser(req)

  if (!user) throw deny('Please sign in before uploading a file.')

  const assignmentId = relId(data.assignment)

  if (!assignmentId) throw deny('Choose the assignment this file belongs to.')

  const assignment = await req.payload.findByID({
    collection: 'assignments',
    id: assignmentId,
    depth: 0,
    req,
  })

  const studentId = relId(data.student)

  if (studentId) {
    if (!hasRole(user, 'student')) throw deny('Only the learner can upload a hand-in attachment.')

    const ownIds = await getChildStudentIds(req, user)

    if (!ownIds.includes(studentId))
      throw deny('You can only upload files for your own learner account.')

    const student = await req.payload.findByID({
      collection: 'students',
      id: studentId,
      depth: 0,
      req,
    })

    if (
      assignment.status !== 'published' ||
      relId(student.currentClass) !== relId(assignment.class)
    ) {
      throw deny('This assignment is not available to that learner.')
    }
  } else if (!hasRole(user, ...ACADEMIC_MANAGERS)) {
    if (!hasRole(user, ...TEACHING_ROLES))
      throw deny('Only teachers can attach resources to assignments.')

    const assignments = await getTeacherAssignmentIds(req, user)

    if (!assignments.includes(assignmentId))
      throw deny('You can only attach files to assignments you manage.')
  }

  return { ...data, uploadedBy: user.id }
}

export const PrivateFiles: CollectionConfig = {
  slug: 'private-files',

  labels: { singular: 'Assignment File', plural: 'Assignment Files' },

  admin: {
    useAsTitle: 'filename',
    defaultColumns: ['filename', 'assignment', 'student', 'uploadedBy'],
    group: 'Academics',
  },

  access: {
    read: fileRead,

    create: ({ req }) => !!getUser(req),

    update: () => false,

    delete: () => false,
  },

  hooks: { beforeChange: [validateUpload] },

  upload: {
    mimeTypes: [
      'application/pdf',

      'application/msword',

      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',

      'application/vnd.ms-excel',

      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',

      'application/vnd.ms-powerpoint',

      'application/vnd.openxmlformats-officedocument.presentationml.presentation',

      'image/*',

      'text/plain',
    ],
  },

  fields: [
    { name: 'alt', type: 'text', required: true },

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
      index: true,
      admin: { readOnly: true },
    },

    {
      name: 'uploadedBy',
      type: 'relationship',
      relationTo: 'users',
      admin: { readOnly: true },
    },
  ],
}
