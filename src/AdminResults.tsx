import { useState } from "react"
import type { FormEvent } from "react"
import { Plus } from "lucide-react"

import { apiCreate, apiUpdate } from "./api"
import { Empty, Note, Page, errorText, nameOf, relId } from "./AdminPeople"
import type { Msg } from "./AdminPeople"
import { Field, STATUS_LABELS, Table, useFind } from "./LiveShell"

type Assessment = {
  id: number
  name: string
  maxMarks?: number
  status?: string
  rejectionNote?: string | null
  class?: unknown
  subject?: unknown
  term?: unknown
}
type MarkLite = { assessment?: unknown; score?: number | null }
type StudentLite = { id: number; status?: string; currentClass?: unknown }
type Option = { id: number; name?: string; isCurrent?: boolean }

export function ResultsMonitorLive() {
  const assessments = useFind<Assessment>("assessments", "limit=500&depth=1&sort=-createdAt")
  const marks = useFind<MarkLite>("marks", "limit=5000&depth=0")
  const students = useFind<StudentLite>("students", "limit=2000&depth=0")
  const terms = useFind<Option>("terms", "limit=100&depth=0&sort=-startDate")
  const classes = useFind<Option>("classes", "limit=300&depth=0&sort=name")
  const subjects = useFind<Option>("subjects", "limit=300&depth=0&sort=name")
  const [termFilter, setTermFilter] = useState("")
  const [classFilter, setClassFilter] = useState("")
  const [open, setOpen] = useState(false)
  const [msg, setMsg] = useState<Msg>({})
  const blank = { name: "", term: "", class: "", subject: "", maxMarks: "100" }
  const [form, setForm] = useState(blank)

  const entered = new Map<number, number>()
  for (const mark of marks.rows) {
    const id = relId(mark.assessment)
    if (id && typeof mark.score === "number") entered.set(id, (entered.get(id) ?? 0) + 1)
  }
  const enrolled = new Map<number, number>()
  for (const student of students.rows) {
    const id = relId(student.currentClass)
    if (id && student.status === "active") enrolled.set(id, (enrolled.get(id) ?? 0) + 1)
  }
  const shown = assessments.rows.filter(
    (a) => (!termFilter || String(relId(a.term)) === termFilter) && (!classFilter || String(relId(a.class)) === classFilter),
  )

  async function move(a: Assessment, status: string, ok: string, note?: string | null) {
    try {
      await apiUpdate("assessments", a.id, { status, ...(note !== undefined ? { rejectionNote: note } : {}) })
      setMsg({ ok })
      await assessments.reload()
    } catch (e) {
      setMsg({ err: errorText(e) })
    }
  }

  function returnToTeacher(a: Assessment) {
    const note = window.prompt("Tell the teacher what needs to be corrected:")
    if (note === null) return
    void move(a, "open", `${a.name} returned to the teacher.`, note.trim() || "Please review and resubmit.")
  }

  function publish(a: Assessment) {
    if (!window.confirm(`Publish ${a.name} for ${nameOf(a.class)}? Learners and parents will be able to see these results immediately.`)) return
    void move(a, "published", `${a.name} published.`)
  }

  async function create(event: FormEvent) {
    event.preventDefault()
    try {
      await apiCreate("assessments", {
        name: form.name,
        term: Number(form.term),
        class: Number(form.class),
        subject: Number(form.subject),
        maxMarks: Number(form.maxMarks),
      })
      setMsg({ ok: `${form.name} created.` })
      setForm(blank)
      setOpen(false)
      await assessments.reload()
    } catch (e) {
      setMsg({ err: errorText(e) })
    }
  }

  return (
    <Page title="Results monitor" subtitle="Follow results as teachers enter them, then approve and publish them to families.">
      <div className="admin-actions">
        <button className="primary-button" onClick={() => setOpen(!open)}>
          <Plus size={15} /> {open ? "Close" : "New assessment"}
        </button>
        <select className="table-select" value={termFilter} onChange={(e) => setTermFilter(e.target.value)}>
          <option value="">All terms</option>
          {terms.rows.map((term) => (
            <option key={term.id} value={term.id}>
              {term.name}
            </option>
          ))}
        </select>
        <select className="table-select" value={classFilter} onChange={(e) => setClassFilter(e.target.value)}>
          <option value="">All classes</option>
          {classes.rows.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
        <Note ok={msg.ok} error={msg.err} />
      </div>
      {open && (
        <form className="content-card record-form" onSubmit={create}>
          <Field label="Assessment name">
            <input required value={form.name} placeholder="End of Term 1 exam" onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </Field>
          <Field label="Term">
            <select required value={form.term} onChange={(e) => setForm({ ...form, term: e.target.value })}>
              <option value="">Choose a term</option>
              {terms.rows.map((term) => (
                <option key={term.id} value={term.id}>
                  {term.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Class">
            <select required value={form.class} onChange={(e) => setForm({ ...form, class: e.target.value })}>
              <option value="">Choose a class</option>
              {classes.rows.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Learning area">
            <select required value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })}>
              <option value="">Choose a learning area</option>
              {subjects.rows.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Marks out of">
            <input required type="number" min={1} value={form.maxMarks} onChange={(e) => setForm({ ...form, maxMarks: e.target.value })} />
          </Field>
          <button className="primary-button" type="submit">
            Create assessment
          </button>
        </form>
      )}
      <div className="content-card">
        <Empty loading={assessments.loading} error={assessments.error} count={shown.length} text="No assessments match. Create one, or ask a teacher to." />
        {shown.length > 0 && (
          <Table heads={["Assessment", "Class", "Learning area", "Term", "Marks entered", "Status", "Actions"]}>
            {shown.map((a) => {
              const classId = relId(a.class) ?? 0
              return (
                <tr key={a.id}>
                  <td>
                    <strong>{a.name}</strong>
                  </td>
                  <td>{nameOf(a.class)}</td>
                  <td>{nameOf(a.subject)}</td>
                  <td>{nameOf(a.term)}</td>
                  <td>
                    {entered.get(a.id) ?? 0} / {enrolled.get(classId) ?? 0}
                  </td>
                  <td>
                    {STATUS_LABELS[a.status ?? "open"]}
                    {a.rejectionNote && a.status === "open" ? ` (returned: ${a.rejectionNote})` : ""}
                  </td>
                  <td>
                    {a.status === "submitted" && (
                      <>
                        <button className="primary-button" onClick={() => void move(a, "approved", `${a.name} approved.`)}>
                          Approve
                        </button>{" "}
                        <button className="secondary-button" onClick={() => returnToTeacher(a)}>
                          Return
                        </button>
                      </>
                    )}
                    {a.status === "approved" && (
                      <>
                        <button className="primary-button" onClick={() => publish(a)}>
                          Publish
                        </button>{" "}
                        <button className="secondary-button" onClick={() => returnToTeacher(a)}>
                          Return
                        </button>
                      </>
                    )}
                    {a.status === "published" && (
                      <button className="secondary-button" onClick={() => void move(a, "approved", `${a.name} withdrawn from families.`)}>
                        Unpublish
                      </button>
                    )}
                    {a.status === "open" && "Waiting for the teacher"}
                  </td>
                </tr>
              )
            })}
          </Table>
        )}
      </div>
    </Page>
  )
}