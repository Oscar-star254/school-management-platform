import { useCallback, useEffect, useMemo, useState } from "react"

import { AlertTriangle, Database, RefreshCw, ShieldCheck } from "lucide-react"

import { apiBackups, apiCreateBackup, apiRequestBackupRestore } from "./api"

import type { BackupJob } from "./api"

const errorText = (error: unknown) =>
  error instanceof Error ? error.message : "The backup request failed."

const formatDate = (value?: string) =>
  value
    ? new Intl.DateTimeFormat(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(
        new Date(value),
      )
    : "—"

const formatSize = (value?: number) => {
  if (value === undefined || value === null) return "—"

  if (value < 1024) return `${value} B`

  const units = ["KB", "MB", "GB", "TB"]

  let size = value / 1024

  let unit = 0

  while (size >= 1024 && unit < units.length - 1) {
    size /= 1024

    unit++
  }

  return `${size.toFixed(1)} ${units[unit]}`
}

const statusLabel: Record<BackupJob["status"], string> = {
  queued: "Queued",

  running: "Running",

  succeeded: "Succeeded",

  failed: "Failed",

  expired: "Expired",
}

export function AdminBackups() {
  const [jobs, setJobs] = useState<BackupJob[]>([])

  const [canTrigger, setCanTrigger] = useState(false)

  const [canRestore, setCanRestore] = useState(false)

  const [loading, setLoading] = useState(true)

  const [busy, setBusy] = useState(false)

  const [error, setError] = useState("")

  const [message, setMessage] = useState("")

  const [selectedId, setSelectedId] = useState("")

  const [confirmation, setConfirmation] = useState("")

  const reload = useCallback(async () => {
    setError("")

    try {
      const data = await apiBackups()

      setJobs(data.jobs)

      setCanTrigger(data.canTrigger)

      setCanRestore(data.canRestore)
    } catch (reason) {
      setError(errorText(reason))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void reload()

    const timer = window.setInterval(() => void reload(), 15000)

    return () => window.clearInterval(timer)
  }, [reload])

  const restorable = useMemo(
    () =>
      jobs.filter(
        (job) => job.operation === "backup" && job.status === "succeeded",
      ),

    [jobs],
  )

  const selected = restorable.find((job) => String(job.id) === selectedId)

  const expectedConfirmation = selected?.fileName
    ? `RESTORE ${selected.fileName}`
    : ""

  async function createBackup() {
    setBusy(true)

    setError("")

    setMessage("")

    try {
      await apiCreateBackup()

      setMessage(
        "Manual backup queued. It will run on the external backup worker.",
      )

      await reload()
    } catch (reason) {
      setError(errorText(reason))
    } finally {
      setBusy(false)
    }
  }

  async function requestRestore(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!selected || confirmation !== expectedConfirmation) return

    setBusy(true)

    setError("")

    setMessage("")

    try {
      await apiRequestBackupRestore(selected.id, confirmation)

      setConfirmation("")

      setMessage(
        "Restore queued. The worker will replace the active database after verification.",
      )

      await reload()
    } catch (reason) {
      setError(errorText(reason))
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <div className="page-heading module-heading">
        <div>
          <h2>Database backups</h2>
          <p>Encrypted PostgreSQL backups for every school in this database.</p>
        </div>
        <button
          className="secondary-button"
          type="button"
          onClick={() => void reload()}
          disabled={busy}
        >
          <RefreshCw size={15} /> Refresh
        </button>
      </div>

      <section
        className="backup-summary content-card"
        aria-label="Backup schedule"
      >
        <div className="backup-summary-icon">
          <Database size={22} />
        </div>
        <div>
          <strong>Automated daily backups</strong>
          <p>
            Scheduled for 2:00 AM in the external worker's configured timezone.
          </p>
          <p>
            Encrypted with age and stored in a private Cloudflare R2 bucket.
            Latest 30 daily backups are retained.
          </p>
          {!canTrigger && (
            <p className="backup-disabled">
              The external worker is not configured yet. Backup jobs cannot be
              queued.
            </p>
          )}
        </div>
        <button
          className="primary-button"
          type="button"
          onClick={() => void createBackup()}
          disabled={busy || !canTrigger}
        >
          <Database size={15} /> {busy ? "Queueing…" : "Run backup now"}
        </button>
      </section>

      {message && (
        <p className="backup-message" role="status">
          {message}
        </p>
      )}
      {error && (
        <p className="backup-error" role="alert">
          <AlertTriangle size={16} /> {error}
        </p>
      )}

      <section className="content-card">
        <div className="backup-section-heading">
          <div>
            <h3>Backup activity</h3>
            <p>
              Status, timestamp, encrypted file size and any reported errors.
            </p>
          </div>
        </div>
        {loading ? (
          <p className="backup-empty">Loading backup history…</p>
        ) : jobs.length === 0 ? (
          <p className="backup-empty">No backup jobs have been recorded yet.</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Type</th>
                  <th>Date</th>
                  <th>File</th>
                  <th>Size</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {jobs.map((job) => (
                  <tr key={job.id}>
                    <td>
                      {job.operation === "restore"
                        ? "Restore"
                        : job.trigger === "daily"
                          ? "Daily backup"
                          : "Manual backup"}
                    </td>
                    <td>{formatDate(job.finishedAt ?? job.createdAt)}</td>
                    <td>
                      <strong>
                        {job.fileName ??
                          (job.operation === "restore"
                            ? "Database restore"
                            : "—")}
                      </strong>
                      {job.error && (
                        <p className="backup-row-error">{job.error}</p>
                      )}
                    </td>
                    <td>{formatSize(job.sizeBytes)}</td>
                    <td>
                      <span
                        className={`backup-status backup-status--${job.status}`}
                      >
                        {statusLabel[job.status]}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="content-card backup-restore">
        <div className="backup-section-heading">
          <div>
            <h3>Restore a database backup</h3>
            <p>
              Restoration is restricted to Super Admins and runs only on the
              external worker.
            </p>
          </div>
          <ShieldCheck size={20} aria-hidden="true" />
        </div>
        {!canRestore ? (
          <p className="backup-empty">
            Restore is unavailable for this account or disabled by deployment
            configuration.
          </p>
        ) : (
          <form onSubmit={requestRestore} className="backup-restore-form">
            <label>
              Completed backup
              <select
                value={selectedId}
                onChange={(event) => {
                  setSelectedId(event.target.value)

                  setConfirmation("")
                }}
                required
              >
                <option value="">Select a retained backup</option>
                {restorable.map((job) => (
                  <option value={job.id} key={job.id}>
                    {job.fileName} —{" "}
                    {formatDate(job.finishedAt ?? job.createdAt)}
                  </option>
                ))}
              </select>
            </label>
            {selected && (
              <label>
                Type <code>{expectedConfirmation}</code> to confirm
                <input
                  autoComplete="off"
                  value={confirmation}
                  onChange={(event) => setConfirmation(event.target.value)}
                  placeholder={expectedConfirmation}
                  required
                />
              </label>
            )}
            <div className="backup-warning">
              <AlertTriangle size={17} />
              <span>
                This replaces the active database. Existing application
                connections will be interrupted; the previous database is
                retained under a separate name for rollback.
              </span>
            </div>
            <button
              className="primary-button"
              type="submit"
              disabled={
                busy || !selected || confirmation !== expectedConfirmation
              }
            >
              Queue database restore
            </button>
          </form>
        )}
      </section>
    </>
  )
}
