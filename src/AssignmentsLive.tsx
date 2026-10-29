import { useState } from "react"
import type { FormEvent } from "react"
import { Plus } from "lucide-react"

import { apiCreate, apiUpdate } from "./api"
import { Empty, Note, Page, errorText, nameOf, relId } from "./AdminPeople"
import type { Msg } from "./AdminPeople"
import { Field, Table, useFind } from "./LiveShell"

type Hw = {
  id: number
  title: string
  instructions?: string | null
  class?: unknown
  subject?: unknown
  dueDate: string
  maxMarks?: number | null
  allowLate?: boolean
  status?: string
}
type Sub = {
  id: number
  assignment?: unknown
  student?: unknown
  text?: string | null
  submittedAt?: string | null
  late?: boolean
  marks?: number | null
  feedback?: string | null
}
type Pair = { id: number; class?: unknown; subject?: unknown }
type Student = { id: number; name?: string; admissionNumber?: string; status?: string }

const heading = { margin: "22px 0 10px", fontSize: 15 } as const
const when = (iso?: string | null) => (iso ? new Date(iso).toLocaleString("en-KE", { dateStyle: "medium", timeStyle: "short" }) : "")
const pastDue = (iso?: string | null) => !!iso && new Date(iso) < new Date()
const toLocalInput = (iso?: string | null) => {
  if (!iso) return ""
  const d = new Date(iso)
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16)
}

/* --------------------------------- teachers --------------------------------- */

export function TeacherAssignments() {
  const homework = useFind<Hw>("assignments", "limit=300&depth=1&sort=-createdAt")
  const submissions = useFind<Sub>("assignment-submissions", "limit=3000&depth=0")
  const pairsQuery = useFind<Pair>("teacher-assignments", "limit=300&depth=1")
  const [selected, setSelected] = useState("")
  const [open, setOpen] = useState(false)
  const [msg, setMsg] = useState<Msg>({})
  const blank = { id: 0, title: "", instructions: "", pair: "", dueDate: "", maxMarks: "", allowLate: false, mode: "publish" }
  const [form, setForm] = useState(blank)
  const [edits, setEdits] = useState<Record<number, { marks: string; feedback: string }>>({})

  const current = homework.rows.find((h) => String(h.id) === selected)
  const classId = relId(current?.class)
  const students = useFind<Student>("students", classId ? `limit=500&depth=0&sort=name&where[currentClass][equals]=${classId}` : null)
  const roster = students.rows.filter((s) => s.status === "active")
  const subsOf = new Map(submissions.rows.filter((s) => relId(s.assignment) === current?.id).map((s) => [relId(s.student) as number, s]))
  const countFor = (id: number) => submissions.rows.filter((s) => relId(s.assignment) === id).length

  const pairs = new Map<string, string>()
  for (const row of pairsQuery.rows) {
    const c = relId(row.class)
    const s = relId(row.subject)
    if (c && s) pairs.set(`${c}:${s}`, `${nameOf(row.class)} · ${nameOf(row.subject)}`)
  }

  function edit(h: Hw) {
    setForm({
      id: h.id,
      title: h.title,
      instructions: h.instructions ?? "",
      pair: `${relId(h.class)}:${relId(h.subject)}`,
      dueDate: toLocalInput(h.dueDate),
      maxMarks: h.maxMarks ? String(h.maxMarks) : "",
      allowLate: !!h.allowLate,
      mode: h.status === "draft" ? "draft" : "publish",
    })
    setOpen(true)
  }

  async function save(event: FormEvent) {
    event.preventDefault()
    const [c, s] = form.pair.split(":").map(Number)
    const data = {
      title: form.title,
      instructions: form.instructions || null,
      class: c,
      subject: s,
      dueDate: new Date(form.dueDate).toISOString(),
      maxMarks: form.maxMarks ? Number(form.maxMarks) : null,
      allowLate: form.allowLate,
      status: form.mode === "draft" ? "draft" : "published",
    }
    try {
      if (form.id) await apiUpdate("assignments", form.id, data)
      else await apiCreate("assignments", data)
      setMsg({ ok: form.mode === "draft" ? "Draft saved." : "Assignment published." })
      setForm(blank)
      setOpen(false)
      await homework.reload()
    } catch (e) {
      setMsg({ err: errorText(e) })
    }
  }

  async function change(h: Hw, status: string, ok: string) {
    try {
      await apiUpdate("assignments", h.id, { status })
      setMsg({ ok })
      await homework.reload()
    } catch (e) {
      setMsg({ err: errorText(e) })
    }
  }

  async function mark(sub: Sub) {
    const edit = edits[sub.id]
    if (!edit) return
    try {
      await apiUpdate("assignment-submissions", sub.id, {
        marks: edit.marks === "" ? null : Number(edit.marks),
        feedback: edit.feedback,
      })
      setMsg({ ok: "Marks and feedback saved." })
      setEdits({ ...edits, [sub.id]: undefined as never })
      await submissions.reload()
    } catch (e) {
      setMsg({ err: errorText(e) })
    }
  }

  return (
    <Page title="Assignments" subtitle="Set work for your classes, then mark what learners hand in.">
      <div className="admin-actions">
        <button className="primary-button" onClick={() => { setOpen(!open); setForm(blank) }} disabled={pairs.size === 0}>
          <Plus size={15} /> {open ? "Close" : "New assignment"}
        </button>
        {pairs.size === 0 && !pairsQuery.loading && <span className="save-message">You have no assigned classes yet.</span>}
        <Note ok={msg.ok} error={msg.err} />
      </div>
      {open && (
        <form className="content-card record-form" onSubmit={save}>
          <Field label="Title">
            <input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </Field>
          <Field label="Class and learning area">
            <select required value={form.pair} onChange={(e) => setForm({ ...form, pair: e.target.value })}>
              <option value="">Choose</option>
              {[...pairs.entries()].map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Instructions">
            <textarea rows={4} value={form.instructions} onChange={(e) => setForm({ ...form, instructions: e.target.value })} />
          </Field>
          <Field label="Due on">
            <input required type="datetime-local" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} />
          </Field>
          <Field label="Marks out of (optional)">
            <input type="number" min={1} value={form.maxMarks} onChange={(e) => setForm({ ...form, maxMarks: e.target.value })} />
          </Field>
          <Field label="Accept late work (marked as late)">
            <input type="checkbox" checked={form.allowLate} onChange={(e) => setForm({ ...form, allowLate: e.target.checked })} />
          </Field>
          <Field label="Save as">
            <select value={form.mode} onChange={(e) => setForm({ ...form, mode: e.target.value })}>
              <option value="publish">Publish now</option>
              <option value="draft">Draft (learners cannot see it)</option>
            </select>
          </Field>
          <button className="primary-button" type="submit">
            {form.id ? "Save changes" : form.mode === "draft" ? "Save draft" : "Publish assignment"}
          </button>
        </form>
      )}
      <div className="content-card">
        <Empty loading={homework.loading} error={homework.error} count={homework.rows.length} text="No assignments yet." />
        {homework.rows.length > 0 && (
          <Table heads={["Assignment", "Class", "Learning area", "Due", "Status", "Handed in", ""]}>
            {homework.rows.map((h) => (
              <tr key={h.id}>
                <td>
                  <strong>{h.title}</strong>
                </td>
                <td>{nameOf(h.class)}</td>
                <td>{nameOf(h.subject)}</td>
                <td>{when(h.dueDate)}</td>
                <td>{h.status === "published" ? "Published" : h.status === "archived" ? "Archived" : "Draft"}</td>
                <td>{countFor(h.id)}</td>
                <td>
                  <button className="secondary-button" onClick={() => setSelected(String(h.id))}>
                    Work
                  </button>{" "}
                  <button className="secondary-button" onClick={() => edit(h)}>
                    Edit
                  </button>{" "}
                  {h.status === "draft" && (
                    <button className="primary-button" onClick={() => void change(h, "published", "Assignment published.")}>
                      Publish
                    </button>
                  )}{" "}
                  {h.status !== "archived" && (
                    <button className="secondary-button" onClick={() => void change(h, "archived", "Assignment archived.")}>
                      Archive
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </Table>
        )}
      </div>
      {current && (
        <>
          <h3 style={heading}>
            {current.title} · {nameOf(current.class)} (due {when(current.dueDate)})
          </h3>
          <div className="content-card">
            <Empty loading={students.loading || submissions.loading} error={students.error} count={roster.length} text="No active learners in this class." />
            {roster.length > 0 && (
              <Table heads={["Learner", "Status", "Answer", current.maxMarks ? `Mark (out of ${current.maxMarks})` : "Mark", "Feedback", ""]}>
                {roster.map((student) => {
                  const sub = subsOf.get(student.id)
                  const status = !sub ? (pastDue(current.dueDate) ? "Missing" : "Not yet") : sub.late ? "Late" : "Handed in"
                  const e = sub ? edits[sub.id] : undefined
                  return (
                    <tr key={student.id}>
                      <td>
                        <strong>{student.name}</strong>
                      </td>
                      <td>{status}</td>
                      <td>
                        {sub ? (
                          <details>
                            <summary>Read</summary>
                            <p style={{ whiteSpace: "pre-wrap" }}>{sub.text || "(no text)"}</p>
                          </details>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td>
                        {sub && (
                          <input
                            type="number"
                            min={0}
                            max={current.maxMarks ?? undefined}
                            style={{ width: 80 }}
                            value={e?.marks ?? (sub.marks ?? "").toString()}
                            onChange={(ev) => setEdits({ ...edits, [sub.id]: { marks: ev.target.value, feedback: e?.feedback ?? sub.feedback ?? "" } })}
                          />
                        )}
                      </td>
                      <td>
                        {sub && (
                          <input
                            value={e?.feedback ?? sub.feedback ?? ""}
                            placeholder="Optional"
                            onChange={(ev) => setEdits({ ...edits, [sub.id]: { marks: e?.marks ?? (sub.marks ?? "").toString(), feedback: ev.target.value } })}
                          />
                        )}
                      </td>
                      <td>
                        {sub && (
                          <button className="secondary-button" disabled={!e} onClick={() => void mark(sub)}>
                            Save
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </Table>
            )}
          </div>
        </>
      )}
    </Page>
  )
}

/* ---------------------------------- family ---------------------------------- */

/** A learner's assignments. Learners can hand in work; parents see the same view without the form. */
export function FamilyAssignments({ child, canSubmit }: { child: { id: number; currentClass?: unknown }; canSubmit: boolean }) {
  const classId = relId(child.currentClass)
  const homework = useFind<Hw>("assignments", "limit=200&depth=1&sort=dueDate")
  const subs = useFind<Sub>("assignment-submissions", `limit=500&depth=0&where[student][equals]=${child.id}`)
  const [drafts, setDrafts] = useState<Record<number, string>>({})
  const [msg, setMsg] = useState<Msg>({})
  const rows = homework.rows.filter((h) => relId(h.class) === classId && h.status === "published")
  const subOf = new Map(subs.rows.map((s) => [relId(s.assignment) as number, s]))

  async function submit(h: Hw) {
    const existing = subOf.get(h.id)
    const text = drafts[h.id] ?? existing?.text ?? ""
    try {
      if (existing) await apiUpdate("assignment-submissions", existing.id, { text })
      else await apiCreate("assignment-submissions", { assignment: h.id, student: child.id, text })
      setMsg({ ok: existing ? "Your work was replaced." : "Your work was handed in." })
      setDrafts({ ...drafts, [h.id]: undefined as never })
      await subs.reload()
    } catch (e) {
      setMsg({ err: errorText(e) })
    }
  }

  return (
    <>
      <Note ok={msg.ok} error={msg.err} />
      <Empty loading={homework.loading} error={homework.error} count={rows.length} text="There are no assignments right now." />
      {rows.map((h) => {
        const sub = subOf.get(h.id)
        const closed = pastDue(h.dueDate) && !h.allowLate
        return (
          <div key={h.id} className="content-card" style={{ padding: 16, marginBottom: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
              <strong>
                {h.title} · {nameOf(h.subject)}
              </strong>
              <small>
                Due {when(h.dueDate)}
                {pastDue(h.dueDate) ? " (deadline passed)" : ""}
              </small>
            </div>
            {h.instructions && <p style={{ whiteSpace: "pre-wrap", margin: "8px 0" }}>{h.instructions}</p>}
            <p style={{ margin: "6px 0" }}>
              <strong>{sub ? (sub.late ? "Handed in late" : "Handed in") : closed ? "Not handed in" : "Not handed in yet"}</strong>
              {sub?.submittedAt ? ` · ${when(sub.submittedAt)}` : ""}
            </p>
            {typeof sub?.marks === "number" && (
              <p style={{ margin: "6px 0" }}>
                Mark: <strong>{sub.marks}</strong>
                {h.maxMarks ? ` out of ${h.maxMarks}` : ""}
                {sub.feedback ? ` · ${sub.feedback}` : ""}
              </p>
            )}
            {!canSubmit && sub?.text && <p style={{ whiteSpace: "pre-wrap", margin: "6px 0" }}>{sub.text}</p>}
            {canSubmit && !closed && (
              <>
                <textarea
                  rows={4}
                  style={{ width: "100%" }}
                  placeholder="Type your answer here"
                  value={drafts[h.id] ?? sub?.text ?? ""}
                  onChange={(e) => setDrafts({ ...drafts, [h.id]: e.target.value })}
                />
                <button className="primary-button" onClick={() => void submit(h)} disabled={!(drafts[h.id] ?? sub?.text ?? "").trim()}>
                  {sub ? "Replace my work" : "Hand in"}
                </button>
              </>
            )}
            {canSubmit && closed && <small>The deadline has passed, so work can no longer be handed in.</small>}
          </div>
        )
      })}
    </>
  )
}