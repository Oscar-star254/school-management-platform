import { commitTransaction, initTransaction, killTransaction } from 'payload'
import type { Endpoint } from 'payload'

import { ACADEMIC_MANAGERS, getUser, hasRole } from '../access'

type GuardianInput = {
  existingId?: number
  name?: string
  phone?: string
  email?: string
  relationship?: string
}
type Body = {
  firstName?: string
  lastName?: string
  dateOfBirth?: string
  classId?: number
  password?: string
  createStudentLogin?: boolean
  studentEmail?: string
  guardians?: GuardianInput[]
}

const fail = (status: number, message: string, data?: unknown) =>
  Response.json({ errors: [{ message, data }] }, { status })

/**
 * Registers a learner together with up to two guardians in one all-or-nothing step.
 * New guardians get a sign-in account; if they have no email, the learner's admission
 * number is their sign-in name. An existing guardian (for a sibling) is simply linked.
 */
export const registerFamily: Endpoint = {
  path: '/register-family',
  method: 'post',
  handler: async (req) => {
    const actor = getUser(req)
    if (!actor || !hasRole(actor, ...ACADEMIC_MANAGERS)) {
      return fail(403, 'You are not allowed to register learners.')
    }

    let body: Body
    try {
      body = ((await req.json?.()) ?? {}) as Body
    } catch {
      return fail(400, 'The registration could not be read.')
    }

    const firstName = body.firstName?.trim()
    const lastName = body.lastName?.trim()
    const guardians = body.guardians ?? []
    if (!firstName || !lastName) return fail(400, 'The learner’s first and last name are required.')
    if (guardians.length < 1) return fail(400, 'Add at least one guardian.')
    if (guardians.length > 2) return fail(400, 'A learner can have at most two guardians.')
    const newOnes = guardians.filter((g) => !g.existingId)
    for (const g of newOnes) {
      if (!g.name?.trim()) return fail(400, 'Each new guardian needs a name.')
    }
    const needsPassword = newOnes.length > 0 || body.createStudentLogin
    if (needsPassword && (body.password ?? '').length < 8) {
      return fail(400, 'Choose a starting password of at least 8 characters.')
    }

    const shouldCommit = await initTransaction(req)
    try {
      const context = { skipRoleRules: true }
      const student = await req.payload.create({
        collection: 'students',
        data: {
          firstName,
          lastName,
          dateOfBirth: body.dateOfBirth || undefined,
          currentClass: body.classId || undefined,
          status: 'active',
        },
        req,
      })
      const admission = String(student.admissionNumber ?? `ID-${student.id}`)
      const slug = admission.toLowerCase()
      const accounts: { name: string; signIn: string }[] = []

      if (body.createStudentLogin) {
        const studentEmail = body.studentEmail?.trim() || `${slug}@family.invalid`
        const user = await req.payload.create({
          collection: 'users',
          data: { name: `${firstName} ${lastName}`, email: studentEmail, password: body.password!, role: 'student', status: 'active' },
          context,
          req,
        })
        await req.payload.update({ collection: 'students', id: student.id, data: { user: user.id }, req })
        accounts.push({ name: `${firstName} ${lastName} (learner)`, signIn: body.studentEmail?.trim() || admission })
      }

      for (const [index, g] of guardians.entries()) {
        let guardianId = g.existingId
        if (!guardianId) {
          const realEmail = g.email?.trim() || undefined
          const user = await req.payload.create({
            collection: 'users',
            data: {
              name: g.name!.trim(),
              email: realEmail ?? `${slug}-g${index + 1}@family.invalid`,
              password: body.password!,
              role: 'parent',
              status: 'active',
              phone: g.phone?.trim() || undefined,
            },
            context,
            req,
          })
          const guardian = await req.payload.create({
            collection: 'guardians',
            data: { name: g.name!.trim(), phone: g.phone?.trim() || undefined, email: realEmail, user: user.id },
            req,
          })
          guardianId = guardian.id
          accounts.push({ name: g.name!.trim(), signIn: realEmail ?? admission })
        }
        await req.payload.create({
          collection: 'guardian-links',
          data: {
            guardian: guardianId,
            student: student.id,
            relationship: (g.relationship as 'mother' | 'father' | 'guardian' | 'other') || 'guardian',
            isPrimary: index === 0,
          },
          req,
        })
      }

      if (shouldCommit) await commitTransaction(req)
      return Response.json({ admissionNumber: admission, studentId: student.id, accounts })
    } catch (error) {
      if (shouldCommit) await killTransaction(req)
      const message = error instanceof Error ? error.message : 'The registration failed.'
      return fail(400, message, (error as { data?: unknown }).data)
    }
  },
}