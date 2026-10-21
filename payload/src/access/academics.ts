import { APIError } from 'payload'
import type { Access, PayloadRequest, Where } from 'payload'

import { ACADEMIC_MANAGERS, ADMIN_ROLES, TEACHING_ROLES, getUser, hasRole } from './index'
import type { AppUser } from './index'
import { getClassTeacherClassIds, getLinkedStudentIds, getTaughtClassIds, relId } from './people'

export const deny = (message: string) => new APIError(message, 403, null, true)

type Ctx = Record<string, unknown>
const cached = <T>(req: PayloadRequest, key: string, load: () => Promise<T>): Promise<T> => {
  const ctx = req.context as Ctx
  if (!(key in ctx)) ctx[key] = load()
  return ctx[key] as Promise<T>
}
const scope = (where: Where): Where => where
const unique = (ids: (number | undefined)[]): number[] => [
  ...new Set(ids.filter((id): id is number => typeof id === 'number')),
]

/* ----------------------------- who is who ----------------------------- */

export const getOwnStudentIds = (req: PayloadRequest, user: AppUser): Promise<number[]> =>
  cached(req, `own-students:${user.id}`, async () => {
    const found = await req.payload.find({
      collection: 'students',
      where: { user: { equals: user.id } },
      depth: 0,
      pagination: false,
      req,
    })
    return unique(found.docs.map((s) => relId(s.id)))
  })

/** The learners this user may see results/attendance for: own record (student) or linked children (parent). */
export const getChildStudentIds = (req: PayloadRequest, user: AppUser): Promise<number[]> => {
  if (hasRole(user, 'parent')) return getLinkedStudentIds(req, user)
  if (hasRole(user, 'student')) return getOwnStudentIds(req, user)
  return Promise.resolve([])
}

export const getChildClassIds = (req: PayloadRequest, user: AppUser): Promise<number[]> =>
  cached(req, `child-classes:${user.id}`, async () => {
    const ids = await getChildStudentIds(req, user)
    if (!ids.length) return []
    const found = await req.payload.find({
      collection: 'students',
      where: { id: { in: ids } },
      depth: 0,
      pagination: false,
      req,
    })
    return unique(found.docs.map((s) => relId(s.currentClass)))
  })

export type Pair = { classId: number; subjectId: number }

/** The (class, subject) pairs a teacher is assigned to teach. */
export const getAssignedPairs = (req: PayloadRequest, user: AppUser): Promise<Pair[]> =>
  cached(req, `pairs:${user.id}`, async () => {
    const found = await req.payload.find({
      collection: 'teacher-assignments',
      where: { teacher: { equals: user.id } },
      depth: 0,
      pagination: false,
      req,
    })
    const pairs: Pair[] = []
    for (const a of found.docs) {
      const classId = relId(a.class)
      const subjectId = relId(a.subject)
      if (classId && subjectId) pairs.push({ classId, subjectId })
    }
    return pairs
  })

const pairsClause = (pairs: Pair[]): Where => ({
  or: pairs.map(
    (p): Where => ({
      and: [{ class: { equals: p.classId } }, { subject: { equals: p.subjectId } }],
    }),
  ),
})

/** Assessments a teacher can see: their own class+subject pairs, plus every subject in a class they lead. */
export const getReadableAssessmentIds = (req: PayloadRequest, user: AppUser): Promise<number[]> =>
  cached(req, `assess-read:${user.id}`, async () => {
    const [pairs, owned] = await Promise.all([
      getAssignedPairs(req, user),
      getClassTeacherClassIds(req, user),
    ])
    const or: Where[] = []
    if (pairs.length) or.push(pairsClause(pairs))
    if (owned.length) or.push({ class: { in: owned } })
    if (!or.length) return []
    const found = await req.payload.find({
      collection: 'assessments',
      where: { or },
      depth: 0,
      pagination: false,
      req,
    })
    return unique(found.docs.map((a) => relId(a.id)))
  })

/** Assessments a teacher can still enter marks for: own pairs and still open. */
export const getEditableAssessmentIds = (req: PayloadRequest, user: AppUser): Promise<number[]> =>
  cached(req, `assess-edit:${user.id}`, async () => {
    const pairs = await getAssignedPairs(req, user)
    if (!pairs.length) return []
    const found = await req.payload.find({
      collection: 'assessments',
      where: { and: [pairsClause(pairs), { status: { equals: 'open' } }] },
      depth: 0,
      pagination: false,
      req,
    })
    return unique(found.docs.map((a) => relId(a.id)))
  })

/** Published assessments in the classes of this student/parent's children. */
export const getPublishedAssessmentIds = (req: PayloadRequest, user: AppUser): Promise<number[]> =>
  cached(req, `assess-published:${user.id}`, async () => {
    const classIds = await getChildClassIds(req, user)
    if (!classIds.length) return []
    const found = await req.payload.find({
      collection: 'assessments',
      where: { and: [{ status: { equals: 'published' } }, { class: { in: classIds } }] },
      depth: 0,
      pagination: false,
      req,
    })
    return unique(found.docs.map((a) => relId(a.id)))
  })

/* -------------------------------- attendance -------------------------------- */

export const attendanceRead: Access = async ({ req }) => {
  const user = getUser(req)
  if (!user) return false
  if (hasRole(user, ...ACADEMIC_MANAGERS)) return true
  if (hasRole(user, ...TEACHING_ROLES)) {
    const classIds = await getTaughtClassIds(req, user)
    return classIds.length ? scope({ class: { in: classIds } }) : false
  }
  const studentIds = await getChildStudentIds(req, user)
  return studentIds.length ? scope({ student: { in: studentIds } }) : false
}

export const attendanceWrite: Access = async ({ req }) => {
  const user = getUser(req)
  if (!user) return false
  if (hasRole(user, ...ACADEMIC_MANAGERS)) return true
  if (hasRole(user, ...TEACHING_ROLES)) {
    const classIds = await getTaughtClassIds(req, user)
    return classIds.length ? scope({ class: { in: classIds } }) : false
  }
  return false
}

/** Creation is checked precisely in the collection hook; this only lets staff through. */
export const staffCanCreate: Access = ({ req }) =>
  hasRole(getUser(req), ...ACADEMIC_MANAGERS, ...TEACHING_ROLES)

/* -------------------------------- assessments -------------------------------- */

export const assessmentsRead: Access = async ({ req }) => {
  const user = getUser(req)
  if (!user) return false
  if (hasRole(user, ...ACADEMIC_MANAGERS)) return true
  if (hasRole(user, ...TEACHING_ROLES)) {
    const ids = await getReadableAssessmentIds(req, user)
    return ids.length ? scope({ id: { in: ids } }) : false
  }
  const ids = await getPublishedAssessmentIds(req, user)
  return ids.length ? scope({ id: { in: ids } }) : false
}

export const assessmentsUpdate: Access = async ({ req }) => {
  const user = getUser(req)
  if (!user) return false
  if (hasRole(user, ...ACADEMIC_MANAGERS)) return true
  if (hasRole(user, ...TEACHING_ROLES)) {
    const ids = await getEditableAssessmentIds(req, user)
    return ids.length ? scope({ id: { in: ids } }) : false
  }
  return false
}

export const assessmentsDelete: Access = ({ req }) => hasRole(getUser(req), ...ADMIN_ROLES)

/* ----------------------------------- marks ----------------------------------- */

export const marksRead: Access = async ({ req }) => {
  const user = getUser(req)
  if (!user) return false
  if (hasRole(user, ...ACADEMIC_MANAGERS)) return true
  if (hasRole(user, ...TEACHING_ROLES)) {
    const ids = await getReadableAssessmentIds(req, user)
    return ids.length ? scope({ assessment: { in: ids } }) : false
  }
  const [studentIds, publishedIds] = await Promise.all([
    getChildStudentIds(req, user),
    getPublishedAssessmentIds(req, user),
  ])
  if (!studentIds.length || !publishedIds.length) return false
  return scope({
    and: [{ student: { in: studentIds } }, { assessment: { in: publishedIds } }],
  })
}

export const marksWrite: Access = async ({ req }) => {
  const user = getUser(req)
  if (!user) return false
  if (hasRole(user, ...ACADEMIC_MANAGERS)) return true
  if (hasRole(user, ...TEACHING_ROLES)) {
    const ids = await getEditableAssessmentIds(req, user)
    return ids.length ? scope({ assessment: { in: ids } }) : false
  }
  return false
}