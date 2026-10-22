import { generatePayloadCookie } from 'payload'
import type { Endpoint } from 'payload'

import { relId } from '../access/people'

const WRONG = 'The sign-in details are incorrect.'

const reply = (status: number, message: string) =>
  Response.json({ errors: [{ message }] }, { status })

/** Turns "1001", "adm-1001" or "ADM-1001" into the stored admission number format. */
const normalizeAdmission = (value: string) =>
  /^\d+$/.test(value) ? `ADM-${value}` : value.toUpperCase()

/**
 * Sign in with either an email address or a learner's admission number.
 * An admission number can belong to the learner's own account or to either of their
 * guardians, so each person's password is tried against their own account only.
 */
export const familyLogin: Endpoint = {
  path: '/family-login',
  method: 'post',
  handler: async (req) => {
    let body: { identifier?: string; password?: string } = {}
    try {
      body = (await req.json?.()) ?? {}
    } catch {
      return reply(400, 'Please enter your email or admission number and your password.')
    }
    const identifier = (body.identifier ?? '').trim()
    const password = body.password ?? ''
    if (!identifier || !password) {
      return reply(400, 'Please enter your email or admission number and your password.')
    }

    const emails: string[] = []
    if (identifier.includes('@')) {
      emails.push(identifier.toLowerCase())
    } else {
      const found = await req.payload.find({
        collection: 'students',
        where: { admissionNumber: { equals: normalizeAdmission(identifier) } },
        depth: 0,
        limit: 1,
      })
      const student = found.docs[0]
      if (student) {
        const userIds: number[] = []
        const own = relId(student.user)
        if (own) userIds.push(own)

        const links = await req.payload.find({
          collection: 'guardian-links',
          where: { student: { equals: student.id } },
          depth: 1,
          pagination: false,
        })
        for (const link of links.docs) {
          const guardian = link.guardian
          if (guardian && typeof guardian === 'object') {
            const guardianUser = relId(guardian.user)
            if (guardianUser) userIds.push(guardianUser)
          }
        }

        if (userIds.length) {
          const users = await req.payload.find({
            collection: 'users',
            where: { id: { in: userIds } },
            depth: 0,
            pagination: false,
          })
          for (const user of users.docs) emails.push(user.email)
        }
      }
    }

    for (const email of emails) {
      try {
        const result = await req.payload.login({ collection: 'users', data: { email, password } })
        if (!result.token) continue
        const cookie = generatePayloadCookie({
          collectionAuthConfig: req.payload.collections.users.config.auth,
          cookiePrefix: req.payload.config.cookiePrefix,
          token: result.token,
        })
        return Response.json(
          { message: 'Login successful.', user: result.user, exp: result.exp },
          { headers: { 'Set-Cookie': cookie } },
        )
      } catch {
        // wrong password for this account (or suspended): try the next one
      }
    }
    return reply(401, WRONG)
  },
}