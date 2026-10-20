import type { Access, FieldAccess, PayloadRequest, Where } from 'payload'

import { ACADEMIC_MANAGERS, ADMIN_PANEL_ROLES, TEACHING_ROLES, getUser, hasRole } from './index'
import type { AppUser } from './index'

type Ctx = Record<string, unknown>

/** Keeps query constraints typed as `Where` so mixed return shapes compile. */
const scope = (where: Where): Where => where

/** Runs `load` once per request for a key (cached on req.context). */
const cached = <T>(req: PayloadRequest, key: string, load: () => Promise<T>): Promise<T> => {
  const ctx = req.context as Ctx
  if (!(key in ctx)) ctx[key] = load()
  return ctx[key] as Promise<T>
}

/** Works for both a raw id and a populated relationship object. */
export const relId = (value: unknown): number | undefined => {
  if (typeof value === 'number') return value
  if (value && typeof value === 'object' && 'id' in value) return (value as { id: number }).id
  return undefined
}

const unique = (ids: (number | undefined)[]): number[] => [
  ...new Set(ids.filter((id): id is number => typeof id === 'number')),
]

/** Classes a teacher may work with: assigned to teach in, or class teacher of. */
export const getTaughtClassIds = (req: PayloadRequest, user: AppUser): Promise<number[]> =>
  cached(req, `taught:${user.id}`, async () => {
    const [assignments, owned] = await Promise.all([
      req.payload.find({
        collection: 'teacher-assignments',
        where: { teacher: { equals: user.id } },
        depth: 0,
        pagination: false,
        req,
      }),
      req.payload.find({
        collection: 'classes',
        where: { classTeacher: { equals: user.id } },
        depth: 0,
        pagination: false,
        req,
      }),
    ])
    return unique([
      ...assignments.docs.map((a) => relId(a.class)),
      ...owned.docs.map((c) => relId(c.id)),
    ])
  })

/** Classes where the user is the designated class teacher (extra access). */
export const getClassTeacherClassIds = (req: PayloadRequest, user: AppUser): Promise<number[]> =>
  cached(req, `owned:${user.id}`, async () => {
    const owned = await req.payload.find({
      collection: 'classes',
      where: { classTeacher: { equals: user.id } },
      depth: 0,
      pagination: false,
      req,
    })
    return unique(owned.docs.map((c) => relId(c.id)))
  })

/** Guardian profiles that belong to this (parent) user. */
export const getOwnGuardianIds = (req: PayloadRequest, user: AppUser): Promise<number[]> =>
  cached(req, `guardians:${user.id}`, async () => {
    const guardians = await req.payload.find({
      collection: 'guardians',
      where: { user: { equals: user.id } },
      depth: 0,
      pagination: false,
      req,
    })
    return unique(guardians.docs.map((g) => relId(g.id)))
  })

/** Students linked to this (parent) user through guardian links. */
export const getLinkedStudentIds = (req: PayloadRequest, user: AppUser): Promise<number[]> =>
  cached(req, `linked:${user.id}`, async () => {
    const guardianIds = await getOwnGuardianIds(req, user)
    if (!guardianIds.length) return []
    const links = await req.payload.find({
      collection: 'guardian-links',
      where: { guardian: { in: guardianIds } },
      depth: 0,
      pagination: false,
      req,
    })
    return unique(links.docs.map((l) => relId(l.student)))
  })

/** Guardians of students in the given classes (for class teachers). */
const getGuardianIdsForClasses = (
  req: PayloadRequest,
  user: AppUser,
  classIds: number[],
): Promise<number[]> =>
  cached(req, `class-guardians:${user.id}`, async () => {
    if (!classIds.length) return []
    const students = await req.payload.find({
      collection: 'students',
      where: { currentClass: { in: classIds } },
      depth: 0,
      pagination: false,
      req,
    })
    const studentIds = unique(students.docs.map((s) => relId(s.id)))
    if (!studentIds.length) return []
    const links = await req.payload.find({
      collection: 'guardian-links',
      where: { student: { in: studentIds } },
      depth: 0,
      pagination: false,
      req,
    })
    return unique(links.docs.map((l) => relId(l.guardian)))
  })

/* ------------------------------ Students ------------------------------ */

export const studentsRead: Access = async ({ req }) => {
  const user = getUser(req)
  if (!user) return false
  if (hasRole(user, ...ADMIN_PANEL_ROLES)) return true
  if (hasRole(user, ...TEACHING_ROLES)) {
    const classIds = await getTaughtClassIds(req, user)
    return classIds.length ? scope({ currentClass: { in: classIds } }) : false
  }
  if (hasRole(user, 'student')) return scope({ user: { equals: user.id } })
  if (hasRole(user, 'parent')) {
    const ids = await getLinkedStudentIds(req, user)
    return ids.length ? scope({ id: { in: ids } }) : false
  }
  return false
}

/** Medical and emergency details: admissions staff, the class teacher, linked parents. */
export const canReadStudentHealth: FieldAccess = async ({ req, doc }) => {
  const user = getUser(req)
  if (!user) return false
  if (hasRole(user, ...ACADEMIC_MANAGERS)) return true
  const record = doc as { id?: number; currentClass?: unknown } | undefined
  if (hasRole(user, ...TEACHING_ROLES)) {
    const classId = relId(record?.currentClass)
    return !!classId && (await getClassTeacherClassIds(req, user)).includes(classId)
  }
  if (hasRole(user, 'parent')) {
    const studentId = relId(record?.id)
    return !!studentId && (await getLinkedStudentIds(req, user)).includes(studentId)
  }
  return false
}

export const canWriteStudentHealth: FieldAccess = ({ req }) =>
  hasRole(getUser(req), ...ACADEMIC_MANAGERS)

/* ------------------------------ Guardians ------------------------------ */

export const guardiansRead: Access = async ({ req }) => {
  const user = getUser(req)
  if (!user) return false
  if (hasRole(user, ...ADMIN_PANEL_ROLES)) return true
  if (hasRole(user, 'parent')) return scope({ user: { equals: user.id } })
  if (hasRole(user, ...TEACHING_ROLES)) {
    const classIds = await getClassTeacherClassIds(req, user)
    const guardianIds = await getGuardianIdsForClasses(req, user, classIds)
    return guardianIds.length ? scope({ id: { in: guardianIds } }) : false
  }
  return false
}

/** Managers edit anything; parents may edit only their own profile's contact fields. */
export const guardiansUpdate: Access = ({ req }) => {
  const user = getUser(req)
  if (!user) return false
  if (hasRole(user, ...ACADEMIC_MANAGERS)) return true
  if (hasRole(user, 'parent')) return { user: { equals: user.id } }
  return false
}

export const managersOnlyField: FieldAccess = ({ req }) =>
  hasRole(getUser(req), ...ACADEMIC_MANAGERS)

export const guardianLinksRead: Access = async ({ req }) => {
  const user = getUser(req)
  if (!user) return false
  if (hasRole(user, ...ADMIN_PANEL_ROLES)) return true
  if (hasRole(user, 'parent')) {
    const guardianIds = await getOwnGuardianIds(req, user)
    return guardianIds.length ? { guardian: { in: guardianIds } } : false
  }
  return false
}

/* --------------------------- Teacher assignments --------------------------- */

export const teacherAssignmentsRead: Access = ({ req }) => {
  const user = getUser(req)
  if (!user) return false
  if (hasRole(user, ...ADMIN_PANEL_ROLES)) return true
  if (hasRole(user, ...TEACHING_ROLES)) return { teacher: { equals: user.id } }
  return false
}

/** Generic: listed roles see all records; everyone else only records whose `field` is them. */
export const ownOrRoles =
  (field: string, ...roles: Parameters<typeof hasRole>[1][]): Access =>
  ({ req }) => {
    const user = getUser(req)
    if (!user) return false
    if (hasRole(user, ...roles)) return true
    return { [field]: { equals: user.id } }
  }