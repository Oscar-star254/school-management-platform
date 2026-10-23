import type { Access, PayloadRequest, Where } from 'payload'

import { ACADEMIC_MANAGERS, ADMIN_PANEL_ROLES, TEACHING_ROLES, getUser, hasRole } from './index'
import type { AppUser } from './index'
import { getAssignedPairs, getChildClassIds, getChildStudentIds } from './academics'
import { getClassTeacherClassIds, getTaughtClassIds, relId } from './people'

const NONE: Where = { id: { equals: 0 } }
const scope = (where: Where): Where => where

type Ctx = Record<string, unknown>
const cached = <T>(req: PayloadRequest, key: string, load: () => Promise<T>): Promise<T> => {
  const ctx = req.context as Ctx
  if (!(key in ctx)) ctx[key] = load()
  return ctx[key] as Promise<T>
}
const unique = (ids: (number | undefined)[]): number[] => [
  ...new Set(ids.filter((id): id is number => typeof id === 'number')),
]

/** Which notice audiences ("staff", "teachers", "parents", "students") a user belongs to. */
export const audienceGroups = (user: AppUser): string[] => {
  if (hasRole(user, 'parent')) return ['parents']
  if (hasRole(user, 'student')) return ['students']
  if (hasRole(user, ...TEACHING_ROLES)) return ['staff', 'teachers']
  return ['staff']
}

/** Classes this person is connected to: teaches/leads (staff) or their children's classes (family). */
export const getMyClassIds = (req: PayloadRequest, user: AppUser): Promise<number[]> =>
  hasRole(user, ...TEACHING_ROLES) ? getTaughtClassIds(req, user) : getChildClassIds(req, user)

/* --------------------------------- notices --------------------------------- */

export const noticesRead: Access = async ({ req }) => {
  const user = getUser(req)
  if (!user) return false
  if (hasRole(user, ...ACADEMIC_MANAGERS)) return true
  const classIds = await getMyClassIds(req, user)
  const audience: Where[] = [
    { audience: { equals: 'all' } },
    { and: [{ audience: { equals: 'role' } }, { audienceRole: { in: audienceGroups(user) } }] },
  ]
  if (classIds.length) {
    audience.push({ and: [{ audience: { equals: 'class' } }, { audienceClass: { in: classIds } }] })
  }
  const visible: Where = {
    and: [
      { status: { equals: 'published' } },
      { or: [{ publishAt: { exists: false } }, { publishAt: { less_than_equal: new Date().toISOString() } }] },
      { or: audience },
    ],
  }
  return hasRole(user, ...TEACHING_ROLES) ? { or: [{ createdBy: { equals: user.id } }, visible] } : visible
}

export const noticesWrite: Access = ({ req }) => {
  const user = getUser(req)
  if (!user) return false
  if (hasRole(user, ...ACADEMIC_MANAGERS)) return true
  if (hasRole(user, ...TEACHING_ROLES)) return scope({ createdBy: { equals: user.id } })
  return false
}

/* ------------------------------ timetable, events ------------------------------ */

export const timetableRead: Access = async ({ req }) => {
  const user = getUser(req)
  if (!user) return false
  if (hasRole(user, ...ACADEMIC_MANAGERS)) return true
  const classIds = await getMyClassIds(req, user)
  if (hasRole(user, ...TEACHING_ROLES)) {
    const or: Where[] = [{ teacher: { equals: user.id } }]
    if (classIds.length) or.push({ class: { in: classIds } })
    return { or }
  }
  return classIds.length ? scope({ class: { in: classIds } }) : NONE
}

export const eventsRead: Access = async ({ req }) => {
  const user = getUser(req)
  if (!user) return false
  if (hasRole(user, ...ADMIN_PANEL_ROLES)) return true
  const classIds = await getMyClassIds(req, user)
  const or: Where[] = [{ class: { exists: false } }]
  if (classIds.length) or.push({ class: { in: classIds } })
  return { or }
}

/* -------------------------------- assignments -------------------------------- */

/** Assignments a teacher manages or sees: their own, their class+subject pairs, or a class they lead. */
export const getTeacherAssignmentIds = (req: PayloadRequest, user: AppUser): Promise<number[]> =>
  cached(req, `hw-ids:${user.id}`, async () => {
    const [pairs, owned] = await Promise.all([getAssignedPairs(req, user), getClassTeacherClassIds(req, user)])
    const or: Where[] = [{ createdBy: { equals: user.id } }]
    if (pairs.length) {
      or.push({
        or: pairs.map(
          (p): Where => ({ and: [{ class: { equals: p.classId } }, { subject: { equals: p.subjectId } }] }),
        ),
      })
    }
    if (owned.length) or.push({ class: { in: owned } })
    const found = await req.payload.find({
      collection: 'assignments',
      where: { or },
      depth: 0,
      pagination: false,
      req,
    })
    return unique(found.docs.map((a) => relId(a.id)))
  })

export const assignmentsRead: Access = async ({ req }) => {
  const user = getUser(req)
  if (!user) return false
  if (hasRole(user, ...ACADEMIC_MANAGERS)) return true
  if (hasRole(user, ...TEACHING_ROLES)) {
    const ids = await getTeacherAssignmentIds(req, user)
    return ids.length ? scope({ id: { in: ids } }) : NONE
  }
  const classIds = await getChildClassIds(req, user)
  return classIds.length
    ? scope({ and: [{ status: { equals: 'published' } }, { class: { in: classIds } }] })
    : NONE
}

export const assignmentsWrite: Access = ({ req }) => {
  const user = getUser(req)
  if (!user) return false
  if (hasRole(user, ...ACADEMIC_MANAGERS)) return true
  if (hasRole(user, ...TEACHING_ROLES)) return scope({ createdBy: { equals: user.id } })
  return false
}

export const submissionsRead: Access = async ({ req }) => {
  const user = getUser(req)
  if (!user) return false
  if (hasRole(user, ...ACADEMIC_MANAGERS)) return true
  if (hasRole(user, ...TEACHING_ROLES)) {
    const ids = await getTeacherAssignmentIds(req, user)
    return ids.length ? scope({ assignment: { in: ids } }) : NONE
  }
  const studentIds = await getChildStudentIds(req, user)
  return studentIds.length ? scope({ student: { in: studentIds } }) : NONE
}

export const submissionsUpdate: Access = async ({ req }) => {
  const user = getUser(req)
  if (!user) return false
  if (hasRole(user, ...ACADEMIC_MANAGERS)) return true
  if (hasRole(user, ...TEACHING_ROLES)) {
    const ids = await getTeacherAssignmentIds(req, user)
    return ids.length ? scope({ assignment: { in: ids } }) : false
  }
  if (hasRole(user, 'student')) {
    const ids = await getChildStudentIds(req, user)
    return ids.length ? scope({ student: { in: ids } }) : false
  }
  return false
}

/** Learners hand in their own work; teachers and managers are checked precisely in the hook. */
export const anySignedIn: Access = ({ req }) => !!getUser(req)