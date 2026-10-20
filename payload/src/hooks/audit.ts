import type { CollectionAfterChangeHook, CollectionAfterDeleteHook } from 'payload'

const NOISE = new Set([
  'updatedAt',
  'createdAt',
  'sessions',
  'hash',
  'salt',
  'loginAttempts',
  'lockUntil',
  'resetPasswordToken',
  'resetPasswordExpiration',
])

type Doc = Record<string, unknown>

const show = (v: unknown) => (v && typeof v === 'object' ? JSON.stringify(v) : String(v ?? ''))

/**
 * Writes an append-only audit row. Only field NAMES are stored for changes, never
 * values, so sensitive data (medical notes, phones) is not copied into the log.
 * `trackValues` lists non-sensitive fields whose before/after values are recorded.
 */
export const auditAfterChange =
  (collection: string, options: { trackValues?: string[] } = {}): CollectionAfterChangeHook =>
  async ({ doc, previousDoc, operation, req }) => {
    if (req.context?.skipAudit) return doc

    const after = doc as Doc
    const before = (previousDoc ?? {}) as Doc
    const changedFields =
      operation === 'update'
        ? Object.keys(after).filter(
            (k) => !NOISE.has(k) && JSON.stringify(after[k]) !== JSON.stringify(before[k]),
          )
        : []
    if (operation === 'update' && changedFields.length === 0) return doc

    const tracked = (options.trackValues ?? [])
      .filter((k) => operation === 'create' || changedFields.includes(k))
      .map((k) =>
        operation === 'create' ? `${k}: ${show(after[k])}` : `${k}: ${show(before[k])} -> ${show(after[k])}`,
      )

    await req.payload.create({
      collection: 'audit-logs',
      data: {
        action: operation,
        targetCollection: collection,
        targetId: String(after.id),
        actor: req.user?.id ?? null,
        summary: [`${operation} ${collection} #${after.id}`, ...tracked].join(' | '),
        changedFields,
      },
      req,
      context: { skipAudit: true },
    })
    return doc
  }

export const auditAfterDelete =
  (collection: string): CollectionAfterDeleteHook =>
  async ({ doc, req }) => {
    if (req.context?.skipAudit) return doc
    await req.payload.create({
      collection: 'audit-logs',
      data: {
        action: 'delete',
        targetCollection: collection,
        targetId: String((doc as Doc).id),
        actor: req.user?.id ?? null,
        summary: `delete ${collection} #${(doc as Doc).id}`,
        changedFields: [],
      },
      req,
      context: { skipAudit: true },
    })
    return doc
  }