import type { Access, PayloadRequest } from 'payload'

export const ROLES = [
  'super_admin',
  'school_admin',
  'academic_admin',
  'finance_admin',
  'teacher',
  'class_teacher',
  'student',
  'parent',
] as const

export type Role = (typeof ROLES)[number]

export const ROLE_LABELS: Record<Role, string> = {
  super_admin: 'Super Admin',
  school_admin: 'School Admin',
  academic_admin: 'Academic Admin',
  finance_admin: 'Finance Admin',
  teacher: 'Teacher',
  class_teacher: 'Class Teacher',
  student: 'Student',
  parent: 'Parent/Guardian',
}

export type AppUser = {
  id: number
  role?: Role | null
  status?: 'active' | 'suspended' | null
}

/** Role groups used across collections. */
export const ADMIN_ROLES: Role[] = ['super_admin', 'school_admin']
export const ACADEMIC_MANAGERS: Role[] = ['super_admin', 'school_admin', 'academic_admin']
export const FINANCE_MANAGERS: Role[] = ['super_admin', 'school_admin', 'finance_admin']
export const ADMIN_PANEL_ROLES: Role[] = [
  'super_admin',
  'school_admin',
  'academic_admin',
  'finance_admin',
]
export const TEACHING_ROLES: Role[] = ['teacher', 'class_teacher']

/** Returns the signed-in user, or null if signed out or suspended. */
export const getUser = (req: PayloadRequest): AppUser | null => {
  const user = req.user as unknown as AppUser | null
  if (!user || user.status === 'suspended') return null
  return user
}

export const hasRole = (user: AppUser | null, ...roles: Role[]): boolean =>
  !!user && !!user.role && roles.includes(user.role)

/** Access: signed-in, active users with any of the given roles. */
export const isRole =
  (...roles: Role[]): Access =>
  ({ req }) =>
    hasRole(getUser(req), ...roles)

export const isAuthenticated: Access = ({ req }) => !!getUser(req)
export const adminsOnly: Access = isRole(...ADMIN_ROLES)
export const academicManagersOnly: Access = isRole(...ACADEMIC_MANAGERS)
export const financeManagersOnly: Access = isRole(...FINANCE_MANAGERS)

/** Access: listed roles see everything; everyone else only their own user record. */
export const selfOrRoles =
  (...roles: Role[]): Access =>
  ({ req }) => {
    const user = getUser(req)
    if (!user) return false
    if (hasRole(user, ...roles)) return true
    return { id: { equals: user.id } }
  }

/** Who may open the Payload admin panel (staff only; others use the school app). */
export const canUseAdminPanel = ({ req }: { req: PayloadRequest }): boolean =>
  hasRole(getUser(req), ...ADMIN_PANEL_ROLES)