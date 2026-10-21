import { useState } from "react"
import type { FormEvent } from "react"
import { Plus } from "lucide-react"

import { apiCreate, apiUpdate } from "./api"
import { ComingSoon, Empty, Note, Page, errorText, nameOf, relId } from "./AdminPeople"
import type { Msg } from "./AdminPeople"
import { Field, STATUS_LABELS, Table, todayLocal, useFind } from "./LiveShell"

type Student = { id: number; admissionNumber?: string; name?: string; status?: string; currentClass?: unknown }
type Assignment = { id: number; class?: unknown; subject?: unknown; academicYear?: unknown }
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
type Mark = { id: number; student?: unknown; score?: number | null; comment?: string | null }
type AttendanceRow = { id: number; student?: unknown; status?: string; note?: string | null }
type TermRow = { id: number; name: string; isCurrent?: boolean }

const heading = { margin: "22px 0 10px", fontSize: 15 } as const

function classesOf(students: Student[]) {
  const seen = new Map<number, string>()
  for (const student of students) {
    const id = relId(student.currentClass)
    if (id) seen.set(id, nameOf(student.currentClass) || `Class ${id}`)
  }
  return [...seen.entries()].map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name))
}

/* -------------------------------- Dashboard -------------------------------- */

function TeacherDashboard() {
  const students = useFind<Student>("students", "limit=1000&depth=1")
  const assessments = useFind<Assessment>("assessments", "limit=300&depth=0")
  const assignments = useFind<Assignment>("teacher-assignments", "limit=300&depth=1")
  const active = students.rows.filter((student) => student.status === "active")
  const count = (status: string) => assessments.rows.filter((a) => a.status === status).length
  const cards: [string, string | number, string][] = [
    ["YOUR CLASSES", classesOf(active).length, "Classes you teach or lead"],
    ["YOUR LEARNERS", active.length, "Active learners in those classes"],
    ["OPEN FOR MARKS", count("open"), "Assessments waiting for your marks"],
    ["WAITING FOR APPROVAL", count("submitted"), "Submitted to the academic office"],
  ]
  return (
    <Page title="Dashboard" subtitle="Your classes and results at a glance.">
      <section className="admin-metrics">
        {cards.map(([label, value, detail]) => (
          <article key={label}>
            <span>{label}</span>
            <strong>{value}</strong>
            <small>{detail}</small>
          </article>
        ))}
      </section>
      <h3 style={heading}>What you teach</h3>
      <div className="content-card">
        <Empty loading={assignments.loading} error={assignments.error} count={assignments.rows.length} text="No classes have been assigned to you yet. Please ask the academic office." />
        {assignments.rows.length > 0 && (
          <Table heads={["Class", "Learning area", "Year"]}>
            {assignments.rows.map((row) => (
              <tr key={row.id}>
                <td>
                  <strong>{nameOf(row.class)}</strong>
                </td>
                <td>{nameOf(row.subject)}</td>
                <td>{nameOf(row.academicYear)}</td>
              </tr>
            ))}
          </Table>
        )}
      </div>
    </Page>
  )
}

/* ---------------------------------- Class ---------------------------------- */

function TeacherClass() {
  const students = useFind<Student>("students", "limit=1000&depth=1&sort=name")
  const classes = classesOf(students.rows)
  const [picked, setPicked] = useState("")
  const classId = picked || String(classes[0]?.id ?? "")
  const roster = students.rows.filter((student) => String(relId(student.currentClass)) === classId)
  return (
    <Page title="Class" subtitle="The learners in your classes.">
      <div className="admin-actions">
        <select className="table-select" value={classId} onChange={(e) => setPicked(e.target.value)}>
          {classes.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
      </div>
      <div className="content-card">
        <Empty loading={students.loading} error={students.error} count={roster.length} text="No learners to show." />
        {roster.length > 0 && (
          <Table heads={["Admission no.", "Learner", "Status"]}>
            {roster.map((student) => (
              <tr key={student.id}>
                <td>{student.admissionNumber}</td>
                <td>
                  <strong>{student.name}</strong>
                </td>
                <td>{student.status}</td>
              </tr>
            ))}
          </Table>
        )}
      </div>
    </Page>
  )
}

/* -------------------------------- Attendance -------------------------------- */

const ATTENDANCE: [string, string][] = [
  ["present", "Present"],
  ["absent", "Absent"],
  ["late", "Late"],
  ["excused", "Excused"],
]

function TeacherAttendance() {
  const students = useFind<Student>("students", "limit=1000&depth=1&sort=name")
  const classes = classesOf(students.rows)
  const [picked, setPicked] = useState("")
  const [date, setDate] = useState(todayLocal())
  const [edits, setEdits] = useState<Record<number, { status: string; note: string }>>({})
  const [msg, setMsg] = useState<Msg>({})
  const [busy, setBusy] = useState(false)

  const classId = picked || String(classes[0]?.id ?? "")
  const dayIso = `${date}T00:00:00.000Z`
  const roster = students.rows.filter(
    (student) => String(relId(student.currentClass)) === classId && student.status === "active",
  )
  const existing = useFind<AttendanceRow>(
    "attendance",
    classId ? `limit=500&depth=0&where[class][equals]=${classId}&where[date][equals]=${encodeURIComponent(dayIso)}` : null,
  )
  const byStudent = new Map(existing.rows.map((row) => [relId(row.student) as number, row]))
  const valueFor = (id: number) => edits[id] ?? { status: byStudent.get(id)?.status ?? "present", note: byStudent.get(id)?.note ?? "" }
  const recorded = existing.rows.length > 0

  async function save() {
    setBusy(true)
    let saved = 0
    const errors: string[] = []
    for (const student of roster) {
      const value = valueFor(student.id)
      const current = byStudent.get(student.id)
      if (current && current.status === value.status && (current.note ?? "") === value.note) continue
      try {
        if (current) await apiUpdate("attendance", current.id, { status: value.status, note: value.note })
        else
          await apiCreate("attendance", {
            student: student.id,
            class: Number(classId),
            date: dayIso,
            status: value.status,
            note: value.note || undefined,
          })
        saved++
      } catch (e) {
        errors.push(`${student.name}: ${errorText(e)}`)
      }
    }
    setBusy(false)
    setEdits({})
    await existing.reload()
    setMsg(errors.length ? { err: errors.join(" · ") } : { ok: saved ? `Attendance saved for ${saved} learner${saved === 1 ? "" : "s"}.` : "Nothing to change." })
  }

  return (
    <Page title="Attendance" subtitle="Mark who is present for your class. Learners not changed are recorded as present.">
      <div className="admin-actions">
        <select className="table-select" value={classId} onChange={(e) => { setPicked(e.target.value); setEdits({}) }}>
          {classes.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
        <input type="date" max={todayLocal()} value={date} onChange={(e) => { setDate(e.target.value); setEdits({}) }} />
        {recorded && <span className="save-message">Already recorded for this date. You can correct it.</span>}
        <Note ok={msg.ok} error={msg.err} />
      </div>
      <div className="content-card">
        <Empty loading={students.loading} error={students.error} count={roster.length} text="No active learners in this class." />
        {roster.length > 0 && (
          <>
            <Table heads={["Admission no.", "Learner", "Attendance", "Note"]}>
              {roster.map((student) => (
                <tr key={student.id}>
                  <td>{student.admissionNumber}</td>
                  <td>
                    <strong>{student.name}</strong>
                  </td>
                  <td>
                    <select
                      className="table-select"
                      value={valueFor(student.id).status}
                      onChange={(e) => setEdits({ ...edits, [student.id]: { ...valueFor(student.id), status: e.target.value } })}
                    >
                      {ATTENDANCE.map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <input
                      value={valueFor(student.id).note}
                      placeholder="Optional"
                      onChange={(e) => setEdits({ ...edits, [student.id]: { ...valueFor(student.id), note: e.target.value } })}
                    />
                  </td>
                </tr>
              ))}
            </Table>
            <div className="form-footer" style={{ padding: 16 }}>
              <button className="primary-button" disabled={busy} onClick={() => void save()}>
                {busy ? "Saving…" : "Save attendance"}
              </button>
            </div>
          </>
        )}
      </div>
    </Page>
  )
}

/* ---------------------------------- Results ---------------------------------- */

function TeacherResults() {
  const assessments = useFind<Assessment>("assessments", "limit=300&depth=1&sort=-createdAt")
  const assignments = useFind<Assignment>("teacher-assignments", "limit=300&depth=1")
  const terms = useFind<TermRow>("terms", "limit=100&depth=0&sort=-startDate")
  const [selected, setSelected] = useState("")
  const [open, setOpen] = useState(false)
  const [msg, setMsg] = useState<Msg>({})
  const [busy, setBusy] = useState(false)
  const [edits, setEdits] = useState<Record<number, { score: string; comment: string }>>({})
  const blank = { name: "", term: "", pair: "", maxMarks: "100" }
  const [form, setForm] = useState(blank)

  const current = assessments.rows.find((a) => String(a.id) === selected)
  const classId = relId(current?.class)
  const students = useFind<Student>("students", classId ? `limit=500&depth=0&sort=name&where[currentClass][equals]=${classId}` : null)
  const marks = useFind<Mark>("marks", current ? `limit=1000&depth=0&where[assessment][equals]=${current.id}` : null)
  const roster = students.rows.filter((student) => student.status === "active")
  const markOf = new Map(marks.rows.map((mark) => [relId(mark.student) as number, mark]))
  const editable = current?.status === "open"
  const max = current?.maxMarks ?? 100

  const pairs = new Map<string, string>()
  for (const row of assignments.rows) {
    const c = relId(row.class)
    const s = relId(row.subject)
    if (c && s) pairs.set(`${c}:${s}`, `${nameOf(row.class)} · ${nameOf(row.subject)}`)
  }

  const scoreText = (id: number) => edits[id]?.score ?? (markOf.get(id)?.score ?? "").toString()
  const commentText = (id: number) => edits[id]?.comment ?? markOf.get(id)?.comment ?? ""

  async function createAssessment(event: FormEvent) {
    event.preventDefault()
    const [c, s] = form.pair.split(":").map(Number)
    try {
      await apiCreate("assessments", { name: form.name, term: Number(form.term), class: c, subject: s, maxMarks: Number(form.maxMarks) })
      setMsg({ ok: `${form.name} created. You can enter marks now.` })
      setForm(blank)
      setOpen(false)
      await assessments.reload()
    } catch (e) {
      setMsg({ err: errorText(e) })
    }
  }

  async function saveMarks() {
    if (!current) return
    setBusy(true)
    let saved = 0
    const errors: string[] = []
    for (const student of roster) {
      if (!edits[student.id]) continue
      const raw = scoreText(student.id).trim()
      const score = raw === "" ? null : Number(raw)
      const existing = markOf.get(student.id)
      try {
        if (existing) await apiUpdate("marks", existing.id, { score, comment: commentText(student.id) })
        else await apiCreate("marks", { assessment: current.id, student: student.id, score, comment: commentText(student.id) || undefined })
        saved++
      } catch (e) {
        errors.push(`${student.name}: ${errorText(e)}`)
      }
    }
    setBusy(false)
    setEdits({})
    await marks.reload()
    setMsg(errors.length ? { err: errors.join(" · ") } : { ok: saved ? `Saved marks for ${saved} learner${saved === 1 ? "" : "s"}.` : "Nothing to save." })
  }

  async function submit() {
    if (!current) return
    const missing = roster.filter((student) => typeof markOf.get(student.id)?.score !== "number").length
    const warning = missing ? `${missing} learner${missing === 1 ? " has" : "s have"} no mark yet. ` : ""
    if (!window.confirm(`${warning}Submit these results for approval? You will not be able to change them afterwards.`)) return
    try {
      await apiUpdate("assessments", current.id, { status: "submitted" })
      setMsg({ ok: "Submitted for approval." })
      await assessments.reload()
    } catch (e) {
      setMsg({ err: errorText(e) })
    }
  }

  return (
    <Page title="Results" subtitle="Enter marks for your assessments, then submit them for approval.">
      <div className="admin-actions">
        <button className="primary-button" onClick={() => setOpen(!open)} disabled={pairs.size === 0}>
          <Plus size={15} /> {open ? "Close" : "New assessment"}
        </button>
        {pairs.size === 0 && !assignments.loading && <span className="save-message">You have no assigned classes yet.</span>}
        <Note ok={msg.ok} error={msg.err} />
      </div>
      {open && (
        <form className="content-card record-form" onSubmit={createAssessment}>
          <Field label="Assessment name">
            <input required value={form.name} placeholder="End of Term 1 exam" onChange={(e) => setForm({ ...form, name: e.target.value })} />
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
          <Field label="Term">
            <select required value={form.term} onChange={(e) => setForm({ ...form, term: e.target.value })}>
              <option value="">Choose a term</option>
              {terms.rows.map((term) => (
                <option key={term.id} value={term.id}>
                  {term.name}
                  {term.isCurrent ? " (current)" : ""}
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
        <Empty loading={assessments.loading} error={assessments.error} count={assessments.rows.length} text="No assessments yet. Create one to start entering marks." />
        {assessments.rows.length > 0 && (
          <Table heads={["Assessment", "Class", "Learning area", "Status", ""]}>
            {assessments.rows.map((a) => (
              <tr key={a.id}>
                <td>
                  <strong>{a.name}</strong>
                </td>
                <td>{nameOf(a.class)}</td>
                <td>{nameOf(a.subject)}</td>
                <td>{STATUS_LABELS[a.status ?? "open"]}</td>
                <td>
                  <button className="secondary-button" onClick={() => { setSelected(String(a.id)); setEdits({}) }}>
                    {a.status === "open" ? "Enter marks" : "View"}
                  </button>
                </td>
              </tr>
            ))}
          </Table>
        )}
      </div>
      {current && (
        <>
          <h3 style={heading}>
            {current.name} · {nameOf(current.class)} · {nameOf(current.subject)} (out of {max})
          </h3>
          {current.rejectionNote && current.status === "open" && (
            <p className="save-message" style={{ color: "#b3261e", marginBottom: 8 }}>
              Returned by the academic office: {current.rejectionNote}
            </p>
          )}
          {!editable && <p className="save-message">These results are {STATUS_LABELS[current.status ?? "open"].toLowerCase()}, so they can no longer be edited.</p>}
          <div className="content-card">
            <Empty loading={students.loading || marks.loading} error={students.error || marks.error} count={roster.length} text="No active learners in this class." />
            {roster.length > 0 && (
              <>
                <Table heads={["Admission no.", "Learner", `Mark (out of ${max})`, "Comment"]}>
                  {roster.map((student) => (
                    <tr key={student.id}>
                      <td>{student.admissionNumber}</td>
                      <td>
                        <strong>{student.name}</strong>
                      </td>
                      <td>
                        <input
                          type="number"
                          min={0}
                          max={max}
                          style={{ width: 90 }}
                          disabled={!editable}
                          value={scoreText(student.id)}
                          onChange={(e) => setEdits({ ...edits, [student.id]: { score: e.target.value, comment: commentText(student.id) } })}
                        />
                      </td>
                      <td>
                        <input
                          disabled={!editable}
                          value={commentText(student.id)}
                          placeholder="Optional"
                          onChange={(e) => setEdits({ ...edits, [student.id]: { score: scoreText(student.id), comment: e.target.value } })}
                        />
                      </td>
                    </tr>
                  ))}
                </Table>
                {editable && (
                  <div className="form-footer" style={{ padding: 16, display: "flex", gap: 10 }}>
                    <button className="secondary-button" disabled={busy || Object.keys(edits).length === 0} onClick={() => void saveMarks()}>
                      {busy ? "Saving…" : "Save marks"}
                    </button>
                    <button className="primary-button" disabled={busy || Object.keys(edits).length > 0} onClick={() => void submit()}>
                      Submit for approval
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </>
      )}
    </Page>
  )
}

/* ----------------------------------- Portal ----------------------------------- */

export function TeacherLive({ page }: { page: string }) {
  switch (page) {
    case "Dashboard":
      return <TeacherDashboard />
    case "Class":
      return <TeacherClass />
    case "Attendance":
      return <TeacherAttendance />
    case "Results":
      return <TeacherResults />
    default:
      return <ComingSoon page={page} />
  }
}