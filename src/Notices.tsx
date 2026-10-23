import { useState } from "react"
import type { FormEvent } from "react"
import { Plus } from "lucide-react"

import { apiCreate, apiDelete, apiUpdate, getCurrentUser } from "./api"
import { Empty, Note, Page, errorText, nameOf, relId } from "./AdminPeople"
import type { Msg } from "./AdminPeople"
import { Field, Table, useFind } from "./LiveShell"

type Notice = {
  id: number
  title: string
  body?: string
  audience?: string
  audienceRole?: string | null
  audienceClass?: unknown
  status?: string
  publishAt?: string | null
  publishedAt?: string | null
  createdBy?: unknown
  createdAt?: string
}
type ClassOpt = { id: number; name?: string }
type StudentLite = { currentClass?: unknown }

const ROLE_LABELS: Record<string, string> = {
  staff: "All staff",
  teachers: "Teachers",
  parents: "Parents and guardians",
  students: "Learners",
}
const heading = { margin: "22px 0 10px", fontSize: 15 } as const

const when = (iso?: string | null) => (iso ? new Date(iso).toLocaleString("en-KE", { dateStyle: "medium", timeStyle: "short" }) : "")
const isFuture = (iso?: string | null) => !!iso && new Date(iso) > new Date()
const stateOf = (n: Notice) =>
  n.status === "archived" ? "Archived" : n.status === "draft" ? "Draft" : isFuture(n.publishAt) ? `Scheduled for ${when(n.publishAt)}` : "Published"
const audienceOf = (n: Notice) =>
  n.audience === "role" ? (ROLE_LABELS[n.audienceRole ?? ""] ?? "A group") : n.audience === "class" ? `Class: ${nameOf(n.audienceClass)}` : "Everyone"
/** An ISO time as the value a datetime-local input expects, in the viewer's own time zone. */
const toLocalInput = (iso?: string | null) => {
  if (!iso) return ""
  const d = new Date(iso)
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16)
}

type Form = { id?: number; title: string; body: string; audience: string; audienceRole: string; audienceClass: string; mode: "now" | "draft" | "schedule"; publishAt: string }
const blank = (teacher: boolean): Form => ({ title: "", body: "", audience: teacher ? "class" : "all", audienceRole: "parents", audienceClass: "", mode: "now", publishAt: "" })

/* ---------------------------------- inbox ---------------------------------- */

/** Notices addressed to the signed-in person, with read tracking. */
export function NoticesInbox({ excludeMine, title = "Notices" }: { excludeMine?: boolean; title?: string }) {
  const notices = useFind<Notice>("notices", "limit=100&depth=1&sort=-publishedAt")
  const reads = useFind<{ notice?: unknown }>("notice-reads", "limit=1000&depth=0")
  const [msg, setMsg] = useState<Msg>({})
  const me = getCurrentUser()?.id
  const readIds = new Set(reads.rows.map((row) => relId(row.notice)))
  const rows = notices.rows.filter((n) => n.status === "published" && !isFuture(n.publishAt) && !(excludeMine && relId(n.createdBy) === me))

  async function markRead(id: number) {
    try {
      await apiCreate("notice-reads", { notice: id })
      await reads.reload()
    } catch (e) {
      setMsg({ err: errorText(e) })
    }
  }

  const body = (
    <>
      <Note ok={msg.ok} error={msg.err} />
      <Empty loading={notices.loading} error={notices.error} count={rows.length} text="There are no notices for you right now." />
      {rows.map((n) => {
        const unread = !readIds.has(n.id)
        return (
          <div key={n.id} className="content-card" style={{ padding: 16, marginBottom: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
              <strong>
                {unread && <span style={{ color: "#b3261e" }}>● </span>}
                {n.title}
              </strong>
              <small>{when(n.publishAt ?? n.publishedAt ?? n.createdAt)}</small>
            </div>
            <small>{audienceOf(n)}</small>
            <p style={{ whiteSpace: "pre-wrap", margin: "8px 0" }}>{n.body}</p>
            {unread && (
              <button className="secondary-button" onClick={() => void markRead(n.id)}>
                Mark as read
              </button>
            )}
          </div>
        )
      })}
    </>
  )
  return excludeMine ? (
    <>
      <h3 style={heading}>{title}</h3>
      {body}
    </>
  ) : (
    <Page title={title} subtitle="Messages from the school.">
      {body}
    </Page>
  )
}

/* ---------------------------------- manage ---------------------------------- */

/** Create, schedule, edit and archive notices. Teachers can only write to their own classes. */
export function NoticesManage({ teacher }: { teacher?: boolean }) {
  const me = getCurrentUser()?.id
  const notices = useFind<Notice>("notices", "limit=300&depth=1&sort=-createdAt")
  const allClasses = useFind<ClassOpt>("classes", teacher ? null : "limit=300&depth=0&sort=name")
  const students = useFind<StudentLite>("students", teacher ? "limit=1000&depth=1" : null)
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState<Form>(blank(!!teacher))
  const [msg, setMsg] = useState<Msg>({})
  const [busy, setBusy] = useState(false)

  const classes: ClassOpt[] = teacher
    ? [...new Map(students.rows.flatMap((s) => (relId(s.currentClass) ? [[relId(s.currentClass) as number, { id: relId(s.currentClass) as number, name: nameOf(s.currentClass) }] as const] : []))).values()]
    : allClasses.rows
  const mine = teacher ? notices.rows.filter((n) => relId(n.createdBy) === me) : notices.rows

  function edit(n: Notice) {
    setForm({
      id: n.id,
      title: n.title,
      body: n.body ?? "",
      audience: n.audience ?? "all",
      audienceRole: n.audienceRole ?? "parents",
      audienceClass: String(relId(n.audienceClass) ?? ""),
      mode: n.status === "draft" ? "draft" : isFuture(n.publishAt) ? "schedule" : "now",
      publishAt: toLocalInput(n.publishAt),
    })
    setOpen(true)
  }

  async function save(event: FormEvent) {
    event.preventDefault()
    if (form.mode === "schedule" && !form.publishAt) {
      setMsg({ err: "Choose when the notice should be published." })
      return
    }
    const data = {
      title: form.title,
      body: form.body,
      audience: form.audience,
      audienceRole: form.audience === "role" ? form.audienceRole : null,
      audienceClass: form.audience === "class" && form.audienceClass ? Number(form.audienceClass) : null,
      status: form.mode === "draft" ? "draft" : "published",
      publishAt: form.mode === "schedule" ? new Date(form.publishAt).toISOString() : null,
    }
    setBusy(true)
    try {
      if (form.id) await apiUpdate("notices", form.id, data)
      else await apiCreate("notices", data)
      setMsg({ ok: form.mode === "draft" ? "Draft saved." : form.mode === "schedule" ? "Notice scheduled." : "Notice published." })
      setForm(blank(!!teacher))
      setOpen(false)
      await notices.reload()
    } catch (e) {
      setMsg({ err: errorText(e) })
    }
    setBusy(false)
  }

  async function change(n: Notice, data: Record<string, unknown>, ok: string) {
    try {
      await apiUpdate("notices", n.id, data)
      setMsg({ ok })
      await notices.reload()
    } catch (e) {
      setMsg({ err: errorText(e) })
    }
  }

  async function remove(n: Notice) {
    if (!window.confirm(`Delete “${n.title}”? This cannot be undone. Archiving keeps a record instead.`)) return
    try {
      await apiDelete("notices", n.id)
      setMsg({ ok: "Notice deleted." })
      await notices.reload()
    } catch (e) {
      setMsg({ err: errorText(e) })
    }
  }

  return (
    <Page title="Notices" subtitle={teacher ? "Write to the parents and learners of your classes." : "Announcements for the whole school, a group of people, or one class."}>
      <div className="admin-actions">
        <button className="primary-button" onClick={() => { setOpen(!open); setForm(blank(!!teacher)) }}>
          <Plus size={15} /> {open ? "Close" : "New notice"}
        </button>
        <Note ok={msg.ok} error={msg.err} />
      </div>
      {open && (
        <form className="content-card record-form" onSubmit={save}>
          <Field label="Title">
            <input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </Field>
          <Field label="Who should receive it">
            <select value={form.audience} onChange={(e) => setForm({ ...form, audience: e.target.value })} disabled={!!teacher}>
              {!teacher && <option value="all">Everyone</option>}
              {!teacher && <option value="role">A group of people</option>}
              <option value="class">One class</option>
            </select>
          </Field>
          {form.audience === "role" && (
            <Field label="Which group">
              <select value={form.audienceRole} onChange={(e) => setForm({ ...form, audienceRole: e.target.value })}>
                {Object.entries(ROLE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </Field>
          )}
          {form.audience === "class" && (
            <Field label="Which class">
              <select required value={form.audienceClass} onChange={(e) => setForm({ ...form, audienceClass: e.target.value })}>
                <option value="">Choose a class</option>
                {classes.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </Field>
          )}
          <Field label="Message">
            <textarea required rows={5} value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} />
          </Field>
          <Field label="When to publish">
            <select value={form.mode} onChange={(e) => setForm({ ...form, mode: e.target.value as Form["mode"] })}>
              <option value="now">Publish now</option>
              <option value="schedule">Schedule for later</option>
              <option value="draft">Save as a draft</option>
            </select>
          </Field>
          {form.mode === "schedule" && (
            <Field label="Publish on">
              <input type="datetime-local" value={form.publishAt} onChange={(e) => setForm({ ...form, publishAt: e.target.value })} />
            </Field>
          )}
          <button className="primary-button" type="submit" disabled={busy}>
            {busy ? "Saving…" : form.id ? "Save changes" : form.mode === "draft" ? "Save draft" : form.mode === "schedule" ? "Schedule notice" : "Publish notice"}
          </button>
        </form>
      )}
      <div className="content-card">
        <Empty loading={notices.loading} error={notices.error} count={mine.length} text="No notices yet. Write the first one." />
        {mine.length > 0 && (
          <Table heads={["Notice", "To", "Status", "Actions"]}>
            {mine.map((n) => (
              <tr key={n.id}>
                <td>
                  <strong>{n.title}</strong>
                </td>
                <td>{audienceOf(n)}</td>
                <td>{stateOf(n)}</td>
                <td>
                  <button className="secondary-button" onClick={() => edit(n)}>
                    Edit
                  </button>{" "}
                  {n.status === "draft" && (
                    <button className="primary-button" onClick={() => void change(n, { status: "published", publishAt: null }, "Notice published.")}>
                      Publish
                    </button>
                  )}{" "}
                  {n.status !== "archived" && (
                    <button className="secondary-button" onClick={() => void change(n, { status: "archived" }, "Notice archived.")}>
                      Archive
                    </button>
                  )}{" "}
                  {!teacher && (
                    <button className="secondary-button" onClick={() => void remove(n)}>
                      Delete
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </Table>
        )}
      </div>
      {teacher && <NoticesInbox excludeMine title="Notices for you" />}
    </Page>
  )
}