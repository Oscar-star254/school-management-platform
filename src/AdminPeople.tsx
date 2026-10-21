import { useCallback, useEffect, useState } from "react"
import type { FormEvent, ReactNode } from "react"
import { Check, Hammer, Plus } from "lucide-react"

import { apiCount, apiCreate, apiFind, apiLearners, apiUpdate } from "./api"
import { hydrateLearners } from "./schoolStore"

/* ------------------------------ shared bits ------------------------------ */

const ROLES: [string, string][] = [
  ["super_admin", "Super Admin"],
  ["school_admin", "School Admin"],
  ["academic_admin", "Academic Admin"],
  ["finance_admin", "Finance Admin"],
  ["teacher", "Teacher"],
  ["class_teacher", "Class Teacher"],
  ["student", "Student"],
  ["parent", "Parent/Guardian"],
]
const STAFF_ROLES = ROLES.filter(([value]) => value !== "student" && value !== "parent")
const roleLabel = (role?: string) => ROLES.find(([value]) => value === role)?.[1] ?? role ?? ""

export const errorText = (error: unknown) =>
  error instanceof Error ? error.message : "Something went wrong"

export const relId = (value: unknown): number | undefined => {
  if (typeof value === "number") return value
  if (value && typeof value === "object" && "id" in value) return (value as { id: number }).id
  return undefined
}

export const nameOf = (value: unknown): string =>
  value && typeof value === "object"
    ? String((value as { name?: string; email?: string }).name ?? (value as { email?: string }).email ?? "")
    : ""

export function useRows<T>(collection: string, query = "limit=200&depth=1&sort=-createdAt") {
  const [rows, setRows] = useState<T[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const reload = useCallback(async () => {
    try {
      setRows(await apiFind<T>(collection, query))
      setError("")
    } catch (e) {
      setError(errorText(e))
    } finally {
      setLoading(false)
    }
  }, [collection, query])
  useEffect(() => {
    void reload()
  }, [reload])
  return { rows, loading, error, reload }
}

export function Page({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return (
    <>
      <div className="page-heading module-heading">
        <div>
          <h2>{title}</h2>
          <p>{subtitle}</p>
        </div>
      </div>
      {children}
    </>
  )
}

export function Note({ ok, error }: { ok?: string; error?: string }) {
  if (error)
    return (
      <span className="save-message" style={{ color: "#b3261e" }}>
        {error}
      </span>
    )
  if (ok)
    return (
      <span className="save-message">
        <Check size={14} /> {ok}
      </span>
    )
  return null
}

export function Empty({ loading, error, count, text }: { loading: boolean; error: string; count: number; text: string }) {
  if (loading) return <p style={{ padding: 16 }}>Loading…</p>
  if (error) return <p style={{ padding: 16, color: "#b3261e" }}>{error}</p>
  if (count === 0) return <p style={{ padding: 16 }}>{text}</p>
  return null
}

export type Msg = { ok?: string; err?: string }

/* -------------------------------- Users & roles -------------------------------- */

type UserRow = { id: number; name?: string; email: string; role?: string; status?: string }

export function UsersRolesLive() {
  const { rows, loading, error, reload } = useRows<UserRow>("users", "limit=200&depth=0&sort=name")
  const [open, setOpen] = useState(false)
  const [msg, setMsg] = useState<Msg>({})
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "teacher", phone: "" })
  const [resetId, setResetId] = useState<number | null>(null)
  const [newPassword, setNewPassword] = useState("")

  async function run(action: () => Promise<unknown>, success: string) {
    try {
      await action()
      setMsg({ ok: success })
      await reload()
    } catch (e) {
      setMsg({ err: errorText(e) })
    }
  }

  function add(event: FormEvent) {
    event.preventDefault()
    void run(async () => {
      await apiCreate("users", { ...form, phone: form.phone || undefined })
      setForm({ name: "", email: "", password: "", role: "teacher", phone: "" })
      setOpen(false)
    }, `${form.name} can now sign in with ${form.email}.`)
  }

  return (
    <Page title="Users & roles" subtitle="Create sign-in accounts, assign roles and suspend access.">
      <div className="admin-actions">
        <button className="primary-button" onClick={() => setOpen(!open)}>
          <Plus size={15} /> {open ? "Close" : "Add user"}
        </button>
        <Note ok={msg.ok} error={msg.err} />
      </div>
      {open && (
        <form className="content-card record-form" onSubmit={add}>
          <label>
            <span>Full name</span>
            <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </label>
          <label>
            <span>Email (used to sign in)</span>
            <input required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </label>
          <label>
            <span>Role</span>
            <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
              {ROLES.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>Starting password (at least 8 characters)</span>
            <input required type="password" minLength={8} autoComplete="new-password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          </label>
          <label>
            <span>Phone (optional)</span>
            <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </label>
          <button className="primary-button" type="submit">
            Create account
          </button>
        </form>
      )}
      <div className="content-card">
        <Empty loading={loading} error={error} count={rows.length} text="No users yet." />
        {rows.length > 0 && (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((user) => (
                  <tr key={user.id}>
                    <td>
                      <strong>{user.name}</strong>
                    </td>
                    <td>{user.email}</td>
                    <td>
                      <select
                        className="table-select"
                        value={user.role}
                        onChange={(e) => void run(() => apiUpdate("users", user.id, { role: e.target.value }), `${user.name} is now ${roleLabel(e.target.value)}.`)}
                      >
                        {ROLES.map(([value, label]) => (
                          <option key={value} value={value}>
                            {label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>{user.status === "suspended" ? "Suspended" : "Active"}</td>
                    <td>
                      <button
                        className="secondary-button"
                        onClick={() =>
                          void run(
                            () => apiUpdate("users", user.id, { status: user.status === "suspended" ? "active" : "suspended" }),
                            user.status === "suspended" ? `${user.name} can sign in again.` : `${user.name} is suspended.`,
                          )
                        }
                      >
                        {user.status === "suspended" ? "Activate" : "Suspend"}
                      </button>{" "}
                      {resetId === user.id ? (
                        <>
                          <input
                            type="password"
                            minLength={8}
                            placeholder="New password"
                            autoComplete="new-password"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                          />{" "}
                          <button
                            className="primary-button"
                            onClick={() =>
                              void run(async () => {
                                await apiUpdate("users", user.id, { password: newPassword })
                                setResetId(null)
                                setNewPassword("")
                              }, `Password changed for ${user.name}.`)
                            }
                          >
                            Save
                          </button>
                        </>
                      ) : (
                        <button className="secondary-button" onClick={() => { setResetId(user.id); setNewPassword("") }}>
                          Reset password
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Page>
  )
}

/* ----------------------------------- Staff ----------------------------------- */

type StaffRow = {
  id: number
  staffNumber?: string
  jobTitle?: string
  employmentType?: string
  user?: { name?: string; email?: string; role?: string } | number
}

export function StaffLive() {
  const { rows, loading, error, reload } = useRows<StaffRow>("staff", "limit=200&depth=1&sort=staffNumber")
  const [open, setOpen] = useState(false)
  const [msg, setMsg] = useState<Msg>({})
  const blank = { name: "", email: "", password: "", role: "teacher", staffNumber: "", jobTitle: "", phone: "", employmentType: "permanent" }
  const [form, setForm] = useState(blank)
  const suggested = `STF-${String(rows.length + 1).padStart(3, "0")}`

  async function add(event: FormEvent) {
    event.preventDefault()
    const staffNumber = form.staffNumber.trim() || suggested
    let userId: number | undefined
    try {
      const user = await apiCreate<{ id: number }>("users", {
        name: form.name,
        email: form.email,
        password: form.password,
        role: form.role,
        phone: form.phone || undefined,
      })
      userId = user.id
      await apiCreate("staff", {
        user: userId,
        staffNumber,
        jobTitle: form.jobTitle || undefined,
        phone: form.phone || undefined,
        employmentType: form.employmentType,
      })
      setMsg({ ok: `${form.name} added as ${staffNumber}. They can sign in with ${form.email}.` })
      setForm(blank)
      setOpen(false)
    } catch (e) {
      setMsg({
        err: userId
          ? `The sign-in account was created, but the staff record failed: ${errorText(e)}. Add the staff record again from this page after fixing it, or ask for help.`
          : errorText(e),
      })
    }
    await reload()
  }

  return (
    <Page title="Staff" subtitle="Staff profiles, staff numbers and their sign-in accounts.">
      <div className="admin-actions">
        <button className="primary-button" onClick={() => setOpen(!open)}>
          <Plus size={15} /> {open ? "Close" : "Add staff member"}
        </button>
        <Note ok={msg.ok} error={msg.err} />
      </div>
      {open && (
        <form className="content-card record-form" onSubmit={add}>
          <label>
            <span>Full name</span>
            <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </label>
          <label>
            <span>Email (used to sign in)</span>
            <input required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </label>
          <label>
            <span>Role</span>
            <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
              {STAFF_ROLES.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>Starting password (at least 8 characters)</span>
            <input required type="password" minLength={8} autoComplete="new-password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          </label>
          <label>
            <span>Staff number</span>
            <input value={form.staffNumber} placeholder={suggested} onChange={(e) => setForm({ ...form, staffNumber: e.target.value })} />
          </label>
          <label>
            <span>Job title</span>
            <input value={form.jobTitle} onChange={(e) => setForm({ ...form, jobTitle: e.target.value })} />
          </label>
          <label>
            <span>Phone</span>
            <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </label>
          <label>
            <span>Employment type</span>
            <select value={form.employmentType} onChange={(e) => setForm({ ...form, employmentType: e.target.value })}>
              <option value="permanent">Permanent</option>
              <option value="contract">Contract</option>
              <option value="part_time">Part-time</option>
              <option value="volunteer">Volunteer</option>
            </select>
          </label>
          <button className="primary-button" type="submit">
            Add staff member
          </button>
        </form>
      )}
      <div className="content-card">
        <Empty loading={loading} error={error} count={rows.length} text="No staff added yet." />
        {rows.length > 0 && (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Staff no.</th>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Job title</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((staff) => {
                  const user = typeof staff.user === "object" ? staff.user : undefined
                  return (
                    <tr key={staff.id}>
                      <td>{staff.staffNumber}</td>
                      <td>
                        <strong>{user?.name}</strong>
                      </td>
                      <td>{user?.email}</td>
                      <td>{roleLabel(user?.role)}</td>
                      <td>{staff.jobTitle}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Page>
  )
}

/* --------------------------------- Guardians --------------------------------- */

type GuardianRow = { id: number; name?: string; phone?: string; email?: string; user?: unknown }
type LinkRow = { id: number; guardian?: unknown; student?: unknown; relationship?: string }
type StudentOption = { id: number; name?: string; admissionNumber?: string }

const RELATIONSHIPS = ["mother", "father", "guardian", "other"]

export function GuardiansLive() {
  const guardians = useRows<GuardianRow>("guardians", "limit=500&depth=0&sort=name")
  const links = useRows<LinkRow>("guardian-links", "limit=1000&depth=1")
  const students = useRows<StudentOption>("students", "limit=1000&depth=0&sort=name")
  const [open, setOpen] = useState(false)
  const [msg, setMsg] = useState<Msg>({})
  const blank = { name: "", phone: "", email: "", password: "", studentId: "", relationship: "guardian" }
  const [form, setForm] = useState(blank)
  const [linkFor, setLinkFor] = useState<number | null>(null)
  const [linkForm, setLinkForm] = useState({ studentId: "", relationship: "guardian" })

  async function reloadAll() {
    await Promise.all([guardians.reload(), links.reload()])
  }

  async function add(event: FormEvent) {
    event.preventDefault()
    let userId: number | undefined
    let guardianId: number | undefined
    try {
      const user = await apiCreate<{ id: number }>("users", {
        name: form.name,
        email: form.email,
        password: form.password,
        role: "parent",
        phone: form.phone || undefined,
      })
      userId = user.id
      const guardian = await apiCreate<{ id: number }>("guardians", {
        name: form.name,
        phone: form.phone || undefined,
        email: form.email,
        user: userId,
      })
      guardianId = guardian.id
      if (form.studentId) {
        await apiCreate("guardian-links", {
          guardian: guardianId,
          student: Number(form.studentId),
          relationship: form.relationship,
        })
      }
      setMsg({ ok: `${form.name} added. They can sign in with ${form.email}.` })
      setForm(blank)
      setOpen(false)
    } catch (e) {
      setMsg({
        err: userId
          ? `Part of this was saved (${guardianId ? "login and guardian record" : "login only"}) but a step failed: ${errorText(e)}.`
          : errorText(e),
      })
    }
    await reloadAll()
  }

  async function addLink(guardianId: number) {
    try {
      await apiCreate("guardian-links", {
        guardian: guardianId,
        student: Number(linkForm.studentId),
        relationship: linkForm.relationship,
      })
      setMsg({ ok: "Child linked." })
      setLinkFor(null)
      setLinkForm({ studentId: "", relationship: "guardian" })
      await reloadAll()
    } catch (e) {
      setMsg({ err: errorText(e) })
    }
  }

  const childrenOf = (guardianId: number) =>
    links.rows
      .filter((link) => relId(link.guardian) === guardianId)
      .map((link) => nameOf(link.student))
      .filter(Boolean)
      .join(", ")

  const studentOptions = (
    <>
      <option value="">No child linked yet</option>
      {students.rows.map((student) => (
        <option key={student.id} value={student.id}>
          {student.name} ({student.admissionNumber})
        </option>
      ))}
    </>
  )

  return (
    <Page title="Guardians" subtitle="Parents and guardians, their sign-in accounts and the children they are linked to.">
      <div className="admin-actions">
        <button className="primary-button" onClick={() => setOpen(!open)}>
          <Plus size={15} /> {open ? "Close" : "Add guardian"}
        </button>
        <Note ok={msg.ok} error={msg.err} />
      </div>
      {open && (
        <form className="content-card record-form" onSubmit={add}>
          <label>
            <span>Full name</span>
            <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </label>
          <label>
            <span>Phone</span>
            <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="254700123456" />
          </label>
          <label>
            <span>Email (used to sign in)</span>
            <input required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </label>
          <label>
            <span>Starting password (at least 8 characters)</span>
            <input required type="password" minLength={8} autoComplete="new-password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          </label>
          <label>
            <span>Child</span>
            <select value={form.studentId} onChange={(e) => setForm({ ...form, studentId: e.target.value })}>
              {studentOptions}
            </select>
          </label>
          <label>
            <span>Relationship</span>
            <select value={form.relationship} onChange={(e) => setForm({ ...form, relationship: e.target.value })}>
              {RELATIONSHIPS.map((value) => (
                <option key={value} value={value}>
                  {value[0].toUpperCase() + value.slice(1)}
                </option>
              ))}
            </select>
          </label>
          <button className="primary-button" type="submit">
            Add guardian
          </button>
        </form>
      )}
      <div className="content-card">
        <Empty loading={guardians.loading} error={guardians.error} count={guardians.rows.length} text="No guardians added yet." />
        {guardians.rows.length > 0 && (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Phone</th>
                  <th>Email</th>
                  <th>Children</th>
                  <th>Link a child</th>
                </tr>
              </thead>
              <tbody>
                {guardians.rows.map((guardian) => (
                  <tr key={guardian.id}>
                    <td>
                      <strong>{guardian.name}</strong>
                    </td>
                    <td>{guardian.phone}</td>
                    <td>{guardian.email}</td>
                    <td>{childrenOf(guardian.id) || "—"}</td>
                    <td>
                      {linkFor === guardian.id ? (
                        <>
                          <select className="table-select" value={linkForm.studentId} onChange={(e) => setLinkForm({ ...linkForm, studentId: e.target.value })}>
                            {studentOptions}
                          </select>{" "}
                          <select className="table-select" value={linkForm.relationship} onChange={(e) => setLinkForm({ ...linkForm, relationship: e.target.value })}>
                            {RELATIONSHIPS.map((value) => (
                              <option key={value} value={value}>
                                {value[0].toUpperCase() + value.slice(1)}
                              </option>
                            ))}
                          </select>{" "}
                          <button className="primary-button" disabled={!linkForm.studentId} onClick={() => void addLink(guardian.id)}>
                            Link
                          </button>
                        </>
                      ) : (
                        <button className="secondary-button" onClick={() => setLinkFor(guardian.id)}>
                          Link a child
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Page>
  )
}

/* --------------------------------- Learners --------------------------------- */

type LearnerRow = {
  id: number
  admissionNumber?: string
  name?: string
  status?: string
  currentClass?: unknown
}
type ClassOption = { id: number; name?: string }

export function LearnersLive() {
  const { rows, loading, error, reload } = useRows<LearnerRow>("students", "limit=1000&depth=1&sort=name")
  const classes = useRows<ClassOption>("classes", "limit=200&depth=0&sort=name")
  const [open, setOpen] = useState(false)
  const [msg, setMsg] = useState<Msg>({})
  const blank = { firstName: "", lastName: "", dateOfBirth: "", classId: "" }
  const [form, setForm] = useState(blank)

  async function refresh() {
    await reload()
    hydrateLearners(await apiLearners().catch(() => []))
  }

  async function register(event: FormEvent) {
    event.preventDefault()
    try {
      const student = await apiCreate<{ admissionNumber?: string }>("students", {
        firstName: form.firstName,
        lastName: form.lastName,
        dateOfBirth: form.dateOfBirth || undefined,
        currentClass: form.classId ? Number(form.classId) : undefined,
      })
      setMsg({ ok: `${form.firstName} ${form.lastName} registered as ${student.admissionNumber}.` })
      setForm(blank)
      setOpen(false)
      await refresh()
    } catch (e) {
      setMsg({ err: errorText(e) })
    }
  }

  async function setStatus(id: number, status: string) {
    try {
      await apiUpdate("students", id, { status })
      setMsg({ ok: "Status updated." })
      await refresh()
    } catch (e) {
      setMsg({ err: errorText(e) })
    }
  }

  return (
    <Page title="Learners" subtitle="Register learners and manage their status. Admission numbers are created automatically.">
      <div className="admin-actions">
        <button className="primary-button" onClick={() => setOpen(!open)}>
          <Plus size={15} /> {open ? "Close registration" : "Register learner"}
        </button>
        <Note ok={msg.ok} error={msg.err} />
      </div>
      {open && (
        <form className="content-card record-form" onSubmit={register}>
          <label>
            <span>First name</span>
            <input required value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} />
          </label>
          <label>
            <span>Last name</span>
            <input required value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} />
          </label>
          <label>
            <span>Date of birth (optional)</span>
            <input type="date" value={form.dateOfBirth} onChange={(e) => setForm({ ...form, dateOfBirth: e.target.value })} />
          </label>
          <label>
            <span>Class</span>
            <select value={form.classId} onChange={(e) => setForm({ ...form, classId: e.target.value })}>
              <option value="">No class yet</option>
              {classes.rows.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>
          <button className="primary-button" type="submit">
            Register learner
          </button>
        </form>
      )}
      <div className="content-card">
        <Empty loading={loading} error={error} count={rows.length} text="No learners registered yet." />
        {rows.length > 0 && (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Admission no.</th>
                  <th>Learner</th>
                  <th>Class</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((learner) => (
                  <tr key={learner.id}>
                    <td>{learner.admissionNumber}</td>
                    <td>
                      <strong>{learner.name}</strong>
                    </td>
                    <td>{nameOf(learner.currentClass) || "—"}</td>
                    <td>
                      <select className="table-select" value={learner.status} onChange={(e) => void setStatus(learner.id, e.target.value)}>
                        <option value="active">Active</option>
                        <option value="completed">Completed</option>
                        <option value="transferred">Transferred</option>
                        <option value="withdrawn">Withdrawn</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Page>
  )
}

/* ------------------------------ Dashboard and log ------------------------------ */

export function DashboardLive() {
  const [counts, setCounts] = useState<Record<string, number>>({})
  const [error, setError] = useState("")
  useEffect(() => {
    const names = ["students", "staff", "guardians", "classes"]
    Promise.all(names.map((name) => apiCount(name).catch(() => 0)))
      .then((values) => setCounts(Object.fromEntries(names.map((name, i) => [name, values[i]]))))
      .catch((e) => setError(errorText(e)))
  }, [])
  const cards: [string, string, string][] = [
    ["LEARNERS", "students", "Registered in the system"],
    ["STAFF", "staff", "Staff profiles"],
    ["GUARDIANS", "guardians", "Parents and guardians"],
    ["CLASSES", "classes", "Classes set up"],
  ]
  return (
    <Page title="School overview" subtitle="Live figures from the school database.">
      {error && <p style={{ color: "#b3261e" }}>{error}</p>}
      <section className="admin-metrics">
        {cards.map(([label, key, detail]) => (
          <article key={key}>
            <span>{label}</span>
            <strong>{counts[key] ?? "…"}</strong>
            <small>{detail}</small>
          </article>
        ))}
      </section>
    </Page>
  )
}

type AuditRow = { id: number; createdAt: string; actor?: unknown; summary?: string }

export function AuditLive() {
  const { rows, loading, error } = useRows<AuditRow>("audit-logs", "limit=100&depth=1&sort=-createdAt")
  return (
    <Page title="Audit log" subtitle="Who changed what. Entries cannot be edited or deleted.">
      <div className="content-card">
        <Empty loading={loading} error={error} count={rows.length} text="Nothing recorded yet." />
        {rows.length > 0 && (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>When</th>
                  <th>Who</th>
                  <th>What</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id}>
                    <td>{new Date(row.createdAt).toLocaleString("en-KE")}</td>
                    <td>{nameOf(row.actor) || "System"}</td>
                    <td>{row.summary}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Page>
  )
}

export function ComingSoon({ page }: { page: string }) {
  return (
    <Page title={page} subtitle="This page is being connected to the school database.">
      <div className="content-card module-panel">
        <span className="module-icon">
          <Hammer size={20} />
        </span>
        <p>Not available yet. It will appear here once it is connected.</p>
      </div>
    </Page>
  )
}