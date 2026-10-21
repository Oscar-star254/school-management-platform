import { APIError } from 'payload'
import type {
  CollectionBeforeChangeHook,
  CollectionBeforeLoginHook,
  CollectionConfig,
} from 'payload'

import {
  ADMIN_PANEL_ROLES,
  ADMIN_ROLES,
  ROLES,
  ROLE_LABELS,
  adminsOnly,
  canUseAdminPanel,
  getUser,
  hasRole,
  selfOrRoles,
} from '../access'
import type { Role } from '../access'
import { auditAfterChange, auditAfterDelete } from '../hooks/audit'

const deny = (message: string) => new APIError(message, 403, null, true)

/**
 * Role and status rules:
 * - the very first account becomes Super Admin
 * - only Super/School Admins can assign roles or suspend/activate accounts
 * - only a Super Admin can create, change, or suspend another Super Admin
 * - nobody can suspend their own account
 * Seed scripts can bypass with `context: { skipRoleRules: true }` (local API only).
 */
const enforceRoleRules: CollectionBeforeChangeHook = async ({
  data,
  originalDoc,
  operation,
  req,
}) => {
  if (req.context?.skipRoleRules) return data

  if (operation === 'create') {
    const { totalDocs } = await req.payload.count({ collection: 'users', req })
    if (totalDocs === 0) {
      return { ...data, role: 'super_admin', status: 'active' }
    }
  }

  const prevRole = originalDoc?.role as Role | undefined
  const prevStatus = (originalDoc?.status as string | undefined) ?? 'active'
  const nextRole = (data.role ?? prevRole ?? 'student') as Role
  const nextStatus = (data.status as string | undefined) ?? prevStatus

  const roleChanged = operation === 'create' || nextRole !== prevRole
  const statusChanged = nextStatus !== prevStatus
  if (!roleChanged && !statusChanged) return data

  const actor = getUser(req)
  if (!hasRole(actor, ...ADMIN_ROLES)) {
    throw deny('Only administrators can assign roles or change account status.')
  }

  const touchesSuperAdmin = nextRole === 'super_admin' || prevRole === 'super_admin'
  if (touchesSuperAdmin && !hasRole(actor, 'super_admin')) {
    throw deny('Only a Super Admin can create or change a Super Admin account.')
  }

  if (statusChanged && nextStatus === 'suspended' && originalDoc?.id === actor?.id) {
    throw deny('You cannot suspend your own account.')
  }

  return data
}

const blockSuspendedLogin: CollectionBeforeLoginHook = ({ user }) => {
  if ((user as { status?: string }).status === 'suspended') {
    throw deny('This account is suspended. Please contact the school office.')
  }
}

export const Users: CollectionConfig = {
  slug: 'users',
  admin: {
    useAsTitle: 'email',
    defaultColumns: ['name', 'email', 'role', 'status'],
    group: 'People',
  },
  auth: {
    tokenExpiration: 60 * 60 * 8, // 8 hours
    maxLoginAttempts: 5,
    lockTime: 10 * 60 * 1000, // 10 minutes
    cookies: {
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'Lax',
    },
  },
  access: {
    admin: canUseAdminPanel,
    create: adminsOnly,
    read: selfOrRoles(...ADMIN_PANEL_ROLES),
    update: selfOrRoles(...ADMIN_ROLES),
    delete: adminsOnly,
  },
  hooks: {
    beforeChange: [enforceRoleRules],
    beforeLogin: [blockSuspendedLogin],
    afterChange: [auditAfterChange('users', { trackValues: ['role', 'status'] })],
    afterDelete: [auditAfterDelete('users')],
  },
  fields: [
    { name: 'name', type: 'text', required: true },
    {
      name: 'role',
      type: 'select',
      required: true,
      defaultValue: 'student',
      index: true,
      options: ROLES.map((value) => ({ label: ROLE_LABELS[value], value })),
      admin: { position: 'sidebar' },
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'active',
      index: true,
      options: [
        { label: 'Active', value: 'active' },
        { label: 'Suspended', value: 'suspended' },
      ],
      admin: { position: 'sidebar' },
    },
    { name: 'phone', type: 'text' },
  ],
}