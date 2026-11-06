import { randomUUID, timingSafeEqual } from 'node:crypto'

import type { Endpoint, PayloadRequest } from 'payload'

import { ADMIN_ROLES, getUser, hasRole } from '../access'
import type { BackupJob } from '../payload-types'

const fail = (status: number, message: string) =>
  Response.json({ errors: [{ message }] }, { status })

const workerAuthorized = (req: PayloadRequest): boolean => {
  const expected = process.env.BACKUP_WORKER_TOKEN
  const authorization = req.headers.get('authorization')
  if (!expected || expected.length < 32 || !authorization?.startsWith('Bearer ')) return false

  const provided = authorization.slice('Bearer '.length)
  const expectedBuffer = Buffer.from(expected)
  const providedBuffer = Buffer.from(provided)
  return (
    expectedBuffer.length === providedBuffer.length &&
    timingSafeEqual(expectedBuffer, providedBuffer)
  )
}

const requireWorker = (req: PayloadRequest) =>
  process.env.BACKUP_WORKER_TOKEN && process.env.BACKUP_WORKER_TOKEN.length >= 32
    ? workerAuthorized(req)
      ? null
      : fail(401, 'Worker authentication failed.')
    : fail(503, 'The backup worker is not configured.')

const serializeJob = (job: BackupJob) => ({
  id: job.id,
  operation: job.operation,
  trigger: job.trigger,
  status: job.status,
  scheduledDate: job.scheduledDate,
  fileName: job.fileName,
  sizeBytes: job.sizeBytes,
  sha256: job.sha256,
  error: job.error,
  startedAt: job.startedAt,
  finishedAt: job.finishedAt,
  createdAt: job.createdAt,
  sourceBackupId: job.sourceBackupId,
})

const adminList: Endpoint = {
  path: '/backups',
  method: 'get',
  handler: async (req) => {
    const user = getUser(req)
    if (!user || !hasRole(user, ...ADMIN_ROLES))
      return fail(403, 'Only administrators can view backups.')

    const { docs } = await req.payload.find({
      collection: 'backup-jobs',
      limit: 100,
      sort: '-createdAt',
      depth: 0,
      overrideAccess: true,
      req,
    })
    const workerConfigured =
      !!process.env.BACKUP_WORKER_TOKEN && process.env.BACKUP_WORKER_TOKEN.length >= 32
    return Response.json({
      jobs: docs.map(serializeJob),
      canTrigger: workerConfigured,
      canRestore:
        workerConfigured &&
        hasRole(user, 'super_admin') &&
        process.env.BACKUP_RESTORE_ENABLED === 'true',
    })
  },
}

const requestManualBackup: Endpoint = {
  path: '/backups',
  method: 'post',
  handler: async (req) => {
    const user = getUser(req)
    if (!user || !hasRole(user, ...ADMIN_ROLES))
      return fail(403, 'Only administrators can request a manual backup.')
    if (!process.env.BACKUP_WORKER_TOKEN || process.env.BACKUP_WORKER_TOKEN.length < 32)
      return fail(503, 'The external backup worker is not configured.')

    const job = await req.payload.create({
      collection: 'backup-jobs',
      overrideAccess: true,
      req,
      data: {
        scheduleKey: `manual:${randomUUID()}`,
        operation: 'backup',
        trigger: 'manual',
        status: 'queued',
        requestedBy: user.id,
      },
    })
    return Response.json({ job: serializeJob(job) }, { status: 202 })
  },
}

const requestRestore: Endpoint = {
  path: '/backups/restore',
  method: 'post',
  handler: async (req) => {
    const user = getUser(req)
    if (!user || !hasRole(user, 'super_admin'))
      return fail(403, 'Only a Super Admin can request a database restore.')
    if (process.env.BACKUP_RESTORE_ENABLED !== 'true')
      return fail(503, 'Restoration is disabled by the deployment configuration.')
    if (!process.env.BACKUP_WORKER_TOKEN || process.env.BACKUP_WORKER_TOKEN.length < 32)
      return fail(503, 'The external backup worker is not configured.')

    let body: { backupId?: number; confirmation?: string }
    try {
      body = (await req.json?.()) as typeof body
    } catch {
      return fail(400, 'The restore request could not be read.')
    }

    if (!body || typeof body !== 'object') return fail(400, 'The restore request is invalid.')
    if (!Number.isSafeInteger(body.backupId) || !body.confirmation)
      return fail(400, 'Choose a backup and provide its confirmation phrase.')

    const backup = await req.payload.findByID({
      collection: 'backup-jobs',
      id: body.backupId!,
      depth: 0,
      overrideAccess: true,
      req,
    })

    if (
      backup.operation !== 'backup' ||
      backup.status !== 'succeeded' ||
      !backup.fileName ||
      !backup.objectKey
    )
      return fail(400, 'Only a completed, retained backup can be restored.')

    if (body.confirmation !== `RESTORE ${backup.fileName}`)
      return fail(400, 'The confirmation phrase does not match the selected backup.')

    const job = await req.payload.create({
      collection: 'backup-jobs',
      overrideAccess: true,
      req,
      data: {
        scheduleKey: `restore:${randomUUID()}`,
        operation: 'restore',
        trigger: 'restore',
        status: 'queued',
        requestedBy: user.id,
        sourceBackupId: backup.id,
      },
    })
    return Response.json({ job: serializeJob(job) }, { status: 202 })
  },
}

const workerSchedule: Endpoint = {
  path: '/backup-worker/schedule',
  method: 'post',
  handler: async (req) => {
    const denied = requireWorker(req)
    if (denied) return denied

    let body: { scheduledDate?: string }
    try {
      body = (await req.json?.()) as typeof body
    } catch {
      return fail(400, 'The schedule request could not be read.')
    }
    if (!body || typeof body !== 'object') return fail(400, 'The schedule request is invalid.')
    if (!body.scheduledDate || !/^\d{4}-\d{2}-\d{2}$/.test(body.scheduledDate))
      return fail(400, 'A valid scheduled date is required.')

    const scheduleKey = `daily:${body.scheduledDate}`
    const existing = await req.payload.find({
      collection: 'backup-jobs',
      where: { scheduleKey: { equals: scheduleKey } },
      limit: 1,
      depth: 0,
      overrideAccess: true,
      req,
    })
    if (existing.docs[0]) return Response.json({ job: serializeJob(existing.docs[0]) })

    try {
      const job = await req.payload.create({
        collection: 'backup-jobs',
        overrideAccess: true,
        req,
        data: {
          scheduleKey,
          scheduledDate: body.scheduledDate,
          operation: 'backup',
          trigger: 'daily',
          status: 'queued',
        },
      })
      return Response.json({ job: serializeJob(job) }, { status: 201 })
    } catch (error) {
      const raced = await req.payload.find({
        collection: 'backup-jobs',
        where: { scheduleKey: { equals: scheduleKey } },
        limit: 1,
        depth: 0,
        overrideAccess: true,
        req,
      })
      if (raced.docs[0]) return Response.json({ job: serializeJob(raced.docs[0]) })
      throw error
    }
  },
}

const workerNext: Endpoint = {
  path: '/backup-worker/next',
  method: 'post',
  handler: async (req) => {
    const denied = requireWorker(req)
    if (denied) return denied

    const pending = await req.payload.find({
      collection: 'backup-jobs',
      where: { status: { equals: 'queued' } },
      limit: 1,
      sort: 'createdAt',
      depth: 0,
      overrideAccess: true,
      req,
    })
    const job = pending.docs[0]
    if (!job) return Response.json({ job: null })

    const claimed = await req.payload.update({
      collection: 'backup-jobs',
      id: job.id,
      overrideAccess: true,
      req,
      data: { status: 'running', startedAt: new Date().toISOString() },
    })
    let sourceBackup: Record<string, unknown> | number | null = null
    if (claimed.operation === 'restore' && claimed.sourceBackupId) {
      const sourceId = Number(claimed.sourceBackupId)
      if (!Number.isSafeInteger(sourceId))
        return fail(500, 'The restore job has an invalid source id.')
      const source = await req.payload.findByID({
        collection: 'backup-jobs',
        id: sourceId,
        depth: 0,
        overrideAccess: true,
        req,
      })
      sourceBackup = {
        id: source.id,
        fileName: source.fileName,
        objectKey: source.objectKey,
        sha256: source.sha256,
      }
    }
    return Response.json({
      job: {
        id: claimed.id,
        operation: claimed.operation,
        trigger: claimed.trigger,
        scheduledDate: claimed.scheduledDate,
        sourceBackup,
      },
    })
  },
}

const workerBackup: Endpoint = {
  path: '/backup-worker/backup',
  method: 'get',
  handler: async (req) => {
    const denied = requireWorker(req)
    if (denied) return denied
    const id = Number(new URL(req.url ?? 'http://localhost').searchParams.get('id'))
    if (!Number.isSafeInteger(id) || id < 1) return fail(400, 'A valid backup id is required.')
    const backup = await req.payload.findByID({
      collection: 'backup-jobs',
      id,
      depth: 0,
      overrideAccess: true,
      req,
    })
    if (
      backup.operation !== 'backup' ||
      backup.status !== 'succeeded' ||
      !backup.fileName ||
      !backup.objectKey ||
      !backup.sha256
    )
      return fail(404, 'The requested verified backup was not found.')
    return Response.json({
      id: backup.id,
      fileName: backup.fileName,
      objectKey: backup.objectKey,
      sha256: backup.sha256,
    })
  },
}

const workerComplete: Endpoint = {
  path: '/backup-worker/complete',
  method: 'post',
  handler: async (req) => {
    const denied = requireWorker(req)
    if (denied) return denied

    let body: {
      id?: number
      operation?: 'backup' | 'restore'
      fileName?: string
      objectKey?: string
      sizeBytes?: number
      sha256?: string
    }
    try {
      body = (await req.json?.()) as typeof body
    } catch {
      return fail(400, 'The completion report could not be read.')
    }
    if (!body || typeof body !== 'object') return fail(400, 'The completion report is invalid.')

    if (!Number.isSafeInteger(body.id)) return fail(400, 'A valid job id is required.')
    const job = await req.payload.findByID({
      collection: 'backup-jobs',
      id: body.id!,
      depth: 0,
      overrideAccess: true,
      req,
    })
    if (job.status !== 'running' || job.operation !== body.operation)
      return fail(409, 'The job is not running or its operation does not match.')

    if (job.operation === 'backup' && (!body.fileName || !body.objectKey || !body.sha256))
      return fail(400, 'A completed backup must include verified storage metadata.')
    if (
      body.sizeBytes !== undefined &&
      (!Number.isSafeInteger(body.sizeBytes) || body.sizeBytes < 0)
    )
      return fail(400, 'Backup size must be a non-negative integer.')

    const updated = await req.payload.update({
      collection: 'backup-jobs',
      id: job.id,
      overrideAccess: true,
      req,
      data: {
        status: 'succeeded',
        finishedAt: new Date().toISOString(),
        ...(job.operation === 'backup'
          ? {
              fileName: body.fileName,
              objectKey: body.objectKey,
              sizeBytes: body.sizeBytes,
              sha256: body.sha256,
            }
          : {}),
      },
    })
    return Response.json({ job: serializeJob(updated) })
  },
}

const workerFail: Endpoint = {
  path: '/backup-worker/fail',
  method: 'post',
  handler: async (req) => {
    const denied = requireWorker(req)
    if (denied) return denied

    let body: { id?: number; error?: string }
    try {
      body = (await req.json?.()) as typeof body
    } catch {
      return fail(400, 'The failure report could not be read.')
    }
    if (!body || typeof body !== 'object') return fail(400, 'The failure report is invalid.')
    if (!Number.isSafeInteger(body.id) || !body.error)
      return fail(400, 'A job id and error summary are required.')

    const current = await req.payload.findByID({
      collection: 'backup-jobs',
      id: body.id!,
      depth: 0,
      overrideAccess: true,
      req,
    })
    if (current.status !== 'running') return fail(409, 'Only a running job can be marked failed.')

    const job = await req.payload.update({
      collection: 'backup-jobs',
      id: body.id!,
      overrideAccess: true,
      req,
      data: {
        status: 'failed',
        finishedAt: new Date().toISOString(),
        error: body.error.slice(0, 2000),
      },
    })
    return Response.json({ job: serializeJob(job) })
  },
}

const workerRetention: Endpoint = {
  path: '/backup-worker/retention',
  method: 'get',
  handler: async (req) => {
    const denied = requireWorker(req)
    if (denied) return denied
    const { docs } = await req.payload.find({
      collection: 'backup-jobs',
      where: {
        and: [
          { operation: { equals: 'backup' } },
          { trigger: { equals: 'daily' } },
          { status: { equals: 'succeeded' } },
        ],
      },
      pagination: false,
      sort: '-createdAt',
      depth: 0,
      overrideAccess: true,
      req,
    })
    return Response.json({
      backups: docs.map((job) => ({
        id: job.id,
        objectKey: job.objectKey,
        createdAt: job.createdAt,
      })),
    })
  },
}

const workerExpire: Endpoint = {
  path: '/backup-worker/expire',
  method: 'post',
  handler: async (req) => {
    const denied = requireWorker(req)
    if (denied) return denied
    let body: { ids?: number[] }
    try {
      body = (await req.json?.()) as typeof body
    } catch {
      return fail(400, 'The retention report could not be read.')
    }
    if (!body || typeof body !== 'object') return fail(400, 'The retention report is invalid.')
    if (!Array.isArray(body.ids) || body.ids.some((id) => !Number.isSafeInteger(id)))
      return fail(400, 'A valid backup id list is required.')

    for (const id of body.ids) {
      const job = await req.payload.findByID({
        collection: 'backup-jobs',
        id,
        depth: 0,
        overrideAccess: true,
        req,
      })
      if (job.operation !== 'backup' || job.trigger !== 'daily' || job.status !== 'succeeded')
        return fail(409, 'Only completed daily backups can expire.')
      await req.payload.update({
        collection: 'backup-jobs',
        id,
        overrideAccess: true,
        req,
        data: { status: 'expired' },
      })
    }
    return Response.json({ expired: body.ids.length })
  },
}

export const backupEndpoints: Endpoint[] = [
  adminList,
  requestManualBackup,
  requestRestore,
  workerSchedule,
  workerNext,
  workerBackup,
  workerComplete,
  workerFail,
  workerRetention,
  workerExpire,
]
