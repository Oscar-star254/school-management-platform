import type { Access, Where } from 'payload'

import { FINANCE_MANAGERS, getUser, hasRole } from './index'
import { getChildStudentIds } from './academics'

const NONE: Where = { id: { equals: 0 } }

/** Only the finance office (Finance Admin, School Admin, Super Admin) can manage money. */
export const financeOnly: Access = ({ req }) => hasRole(getUser(req), ...FINANCE_MANAGERS)

/** The finance office sees everything; a learner or parent sees only their own child's records. */
export const financeOrFamily =
  (extra: Where[] = []): Access =>
  async ({ req }) => {
    const user = getUser(req)
    if (!user) return false
    if (hasRole(user, ...FINANCE_MANAGERS)) return true
    if (hasRole(user, 'parent', 'student')) {
      const ids = await getChildStudentIds(req, user)
      return ids.length ? { and: [{ student: { in: ids } }, ...extra] } : NONE
    }
    return false
  }

export const never: Access = () => false