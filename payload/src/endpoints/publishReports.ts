import { commitTransaction, initTransaction, killTransaction } from 'payload'

import type { Endpoint } from 'payload'

import { ACADEMIC_MANAGERS, getUser, hasRole } from '../access'

import { relId } from '../access/people'

const fail = (status: number, message: string) =>
  Response.json({ errors: [{ message }] }, { status })

type PublishRequest = { classId?: number; termId?: number; studentIds?: number[] }

export const publishReports: Endpoint = {
  path: '/publish-reports',

  method: 'post',

  handler: async (req) => {
    const actor = getUser(req)

    if (!actor || !hasRole(actor, ...ACADEMIC_MANAGERS))
      return fail(403, 'Only academic administrators can publish reports.')

    let body: PublishRequest

    try {
      body = (await req.json?.()) as PublishRequest
    } catch {
      return fail(400, 'The request could not be read.')
    }

    const classId = Number(body.classId)

    const termId = Number(body.termId)

    if (!Number.isInteger(classId) || classId <= 0 || !Number.isInteger(termId) || termId <= 0) {
      return fail(400, 'Choose a class and term.')
    }

    if (
      body.studentIds !== undefined &&
      (!Array.isArray(body.studentIds) ||
        body.studentIds.some((id) => !Number.isInteger(id) || id <= 0))
    ) {
      return fail(400, 'The learner selection is invalid.')
    }

    if (body.studentIds?.length === 0) return fail(400, 'Select at least one learner to publish.')

    const shouldCommit = await initTransaction(req)

    try {
      const classStudents = await req.payload.find({
        collection: 'students',

        where: {
          and: [
            { currentClass: { equals: classId } },

            { status: { equals: 'active' } },

            ...(body.studentIds?.length ? [{ id: { in: body.studentIds } }] : []),
          ],
        },

        depth: 0,

        pagination: false,

        req,
      })

      if (body.studentIds?.length && classStudents.docs.length !== new Set(body.studentIds).size) {
        throw new Error('One or more selected learners are not active members of this class.')
      }

      if (!classStudents.docs.length)
        throw new Error('There are no active learners selected for this class.')

      const assessments = await req.payload.find({
        collection: 'assessments',

        where: {
          and: [
            { class: { equals: classId } },

            { term: { equals: termId } },

            { status: { equals: 'published' } },
          ],
        },

        limit: 1,

        depth: 0,

        req,
      })

      if (!assessments.totalDocs)
        throw new Error('Publish at least one approved result before publishing report forms.')

      const marks = await req.payload.find({
        collection: 'marks',

        where: {
          and: [
            {
              student: { in: classStudents.docs.map((student) => student.id) },
            },

            {
              assessment: {
                in: assessments.docs.map((assessment) => assessment.id),
              },
            },
          ],
        },

        limit: 10000,

        depth: 0,

        req,
      })

      const readyStudentIds = new Set(
        marks.docs.map((mark) => relId(mark.student)).filter((id): id is number => !!id),
      )

      if (body.studentIds?.some((id) => !readyStudentIds.has(id))) {
        throw new Error('One or more selected learners do not yet have published results.')
      }

      const eligibleStudents = classStudents.docs.filter((student) =>
        readyStudentIds.has(student.id),
      )

      if (!eligibleStudents.length)
        throw new Error('No selected learners have published results yet.')

      let published = 0

      let alreadyPublished = 0

      for (const student of eligibleStudents) {
        const existing = await req.payload.find({
          collection: 'report-publications',

          where: {
            and: [{ student: { equals: student.id } }, { term: { equals: termId } }],
          },

          limit: 1,

          depth: 0,

          req,
        })

        if (existing.totalDocs) {
          alreadyPublished++

          continue
        }

        await req.payload.create({
          collection: 'report-publications',

          data: {
            student: student.id,

            class: classId,

            term: termId,

            publishedBy: actor.id,

            publishedAt: new Date().toISOString(),
          },

          draft: false,

          overrideAccess: true,

          req,
        })

        published++
      }

      if (shouldCommit) await commitTransaction(req)

      return Response.json({
        published,
        alreadyPublished,
        skippedWithoutResults: classStudents.docs.length - eligibleStudents.length,
      })
    } catch (error) {
      if (shouldCommit) await killTransaction(req)

      return fail(400, error instanceof Error ? error.message : 'Reports could not be published.')
    }
  },
}
