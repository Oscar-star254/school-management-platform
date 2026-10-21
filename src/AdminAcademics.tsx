import { useState } from "react"
import type { FormEvent } from "react"
import { Plus } from "lucide-react"

import { apiCreate, apiDelete, apiUpdate } from "./api"
import { Empty, Note, Page, errorText, nameOf, relId, useRows } from "./AdminPeople"
import type { Msg } from "./AdminPeople"

type Year = { id: number; name: string; startDate: string; endDate: string; isCurrent?: boolean }
type Term = {
  id: number
  name: string
  academicYear?: unknown
  startDate: string
  endDate: string
  isCurrent?: boolean
  isLocked?: boolean
}
type ClassRow = {
  id: number
  name?: string
  academicYear?: unknown
  classTeacher?: unknown
  capacity?: number
}
type UserOption = { id: number; name?: string; role?: string }
type SubjectRow = { id: number; name: string; code: string; department?: string; isActive?: boolean }
type AssignmentRow = { id: number; teacher?: unknown; class?: unknown; subject?: unknown; academicYear?: unknown }

const day = (value?: string) => (value ? value.slice(0, 10) : "")
const heading = { margin: "22px 0 10px", fontSize: 15 } as const

const TEACHER_QUERY = "limit=300&depth=0&sort=name&where[role][in]=teacher,class_teacher"

/* ------------------------------ Terms & classes ------------------------------ */

function YearsSection({ years }: { years: ReturnType<typeof useRows<Year>> }) {
  const [open, setOpen] = useState(false)
  const [msg, setMsg] = useState<Msg>({})
  const blank = { name: "", startDate: "", endDate: "", isCurrent: false }
  const [form, setForm] = useState(blank)

  async function add(event: FormEvent) {
    event.preventDefault()
    try {
      await apiCreate("academic-years", form)
      setMsg({ ok: `Academic year ${form.name} added.` })
      setForm(blank)
      setOpen(false)
      await years.reload()
    } catch (e) {
      setMsg({ err: errorText(e) })
    }
  }
  async function makeCurrent(id: number) {
    try {
      await apiUpdate("academic-years", id, { isCurrent: true })
      setMsg({ ok: "Current academic year changed." })
      await years.reload()
    } catch (e) {
      setMsg({ err: errorText(e) })
    }
  }

  return (
    <>
      <h3 style={heading}>Academic years</h3>
      <div className="admin-actions">
        <button className="primary-button" onClick={() => setOpen(!open)}>
          <Plus size={15} /> {open ? "Close" : "Add academic year"}
        </button>
        <Note ok={msg.ok} error={msg.err} />
      </div>
      {open && (
        <form className="content-card record-form" onSubmit={add}>
          <label>
            <span>Name (for example 2026)</span>
            <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </label>
          <label>
            <span>Starts</span>
            <input required type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
          </label>
          <label>
            <span>Ends</span>
            <input required type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} />
          </label>
          <label>
            <span>Make this the current year</span>
            <input type="checkbox" checked={form.isCurrent} onChange={(e) => setForm({ ...form, isCurrent: e.target.checked })} />
          </label>
          <button className="primary-button" type="submit">
            Add academic year
          </button>
        </form>
      )}
      <div className="content-card">
        <Empty loading={years.loading} error={years.error} count={years.rows.length} text="No academic years yet. Add one first." />
        {years.rows.length > 0 && (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Year</th>
                  <th>Starts</th>
                  <th>Ends</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {years.rows.map((year) => (
                  <tr key={year.id}>
                    <td>
                      <strong>{year.name}</strong>
                    </td>
                    <td>{day(year.startDate)}</td>
                    <td>{day(year.endDate)}</td>
                    <td>
                      {year.isCurrent ? (
                        "Current"
                      ) : (
                        <button className="secondary-button" onClick={() => void makeCurrent(year.id)}>
                          Make current
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
    </>
  )
}

function TermsSection({ years, terms }: { years: ReturnType<typeof useRows<Year>>; terms: ReturnType<typeof useRows<Term>> }) {
  const [open, setOpen] = useState(false)
  const [msg, setMsg] = useState<Msg>({})
  const blank = { academicYear: "", name: "", startDate: "", endDate: "", isCurrent: false }
  const [form, setForm] = useState(blank)

  async function add(event: FormEvent) {
    event.preventDefault()
    try {
      await apiCreate("terms", { ...form, academicYear: Number(form.academicYear) })
      setMsg({ ok: `${form.name} added.` })
      setForm(blank)
      setOpen(false)
      await terms.reload()
    } catch (e) {
      setMsg({ err: errorText(e) })
    }
  }
  async function change(id: number, data: Record<string, unknown>, ok: string) {
    try {
      await apiUpdate("terms", id, data)
      setMsg({ ok })
      await terms.reload()
    } catch (e) {
      setMsg({ err: errorText(e) })
    }
  }

  return (
    <>
      <h3 style={heading}>Terms</h3>
      <div className="admin-actions">
        <button className="primary-button" onClick={() => setOpen(!open)} disabled={years.rows.length === 0}>
          <Plus size={15} /> {open ? "Close" : "Add term"}
        </button>
        {years.rows.length === 0 && <span className="save-message">Add an academic year first.</span>}
        <Note ok={msg.ok} error={msg.err} />
      </div>
      {open && (
        <form className="content-card record-form" onSubmit={add}>
          <label>
            <span>Academic year</span>
            <select required value={form.academicYear} onChange={(e) => setForm({ ...form, academicYear: e.target.value })}>
              <option value="">Choose a year</option>
              {years.rows.map((year) => (
                <option key={year.id} value={year.id}>
                  {year.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>Name (for example Term 1)</span>
            <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </label>
          <label>
            <span>Starts</span>
            <input required type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
          </label>
          <label>
            <span>Ends</span>
            <input required type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} />
          </label>
          <label>
            <span>Make this the current term</span>
            <input type="checkbox" checked={form.isCurrent} onChange={(e) => setForm({ ...form, isCurrent: e.target.checked })} />
          </label>
          <button className="primary-button" type="submit">
            Add term
          </button>
        </form>
      )}
      <div className="content-card">
        <Empty loading={terms.loading} error={terms.error} count={terms.rows.length} text="No terms yet." />
        {terms.rows.length > 0 && (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Term</th>
                  <th>Year</th>
                  <th>Starts</th>
                  <th>Ends</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {terms.rows.map((term) => (
                  <tr key={term.id}>
                    <td>
                      <strong>{term.name}</strong>
                    </td>
                    <td>{nameOf(term.academicYear)}</td>
                    <td>{day(term.startDate)}</td>
                    <td>{day(term.endDate)}</td>
                    <td>
                      {term.isCurrent ? "Current" : "—"} · {term.isLocked ? "Locked" : "Open"}
                    </td>
                    <td>
                      {!term.isCurrent && (
                        <>
                          <button className="secondary-button" onClick={() => void change(term.id, { isCurrent: true }, "Current term changed.")}>
                            Make current
                          </button>{" "}
                        </>
                      )}
                      <button
                        className="secondary-button"
                        onClick={() => void change(term.id, { isLocked: !term.isLocked }, term.isLocked ? "Term unlocked." : "Term locked.")}
                      >
                        {term.isLocked ? "Unlock" : "Lock"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  )
}

function ClassesSection({
  years,
  classes,
  teachers,
}: {
  years: ReturnType<typeof useRows<Year>>
  classes: ReturnType<typeof useRows<ClassRow>>
  teachers: ReturnType<typeof useRows<UserOption>>
}) {
  const [open, setOpen] = useState(false)
  const [msg, setMsg] = useState<Msg>({})
  const blank = { grade: "", stream: "", academicYear: "", classTeacher: "", capacity: "" }
  const [form, setForm] = useState(blank)

  async function add(event: FormEvent) {
    event.preventDefault()
    try {
      await apiCreate("classes", {
        grade: form.grade,
        stream: form.stream || undefined,
        academicYear: Number(form.academicYear),
        classTeacher: form.classTeacher ? Number(form.classTeacher) : undefined,
        capacity: form.capacity ? Number(form.capacity) : undefined,
      })
      setMsg({ ok: `${[form.grade, form.stream].filter(Boolean).join(" ")} added.` })
      setForm(blank)
      setOpen(false)
      await classes.reload()
    } catch (e) {
      setMsg({ err: errorText(e) })
    }
  }
  async function setClassTeacher(id: number, value: string) {
    try {
      await apiUpdate("classes", id, { classTeacher: value ? Number(value) : null })
      setMsg({ ok: "Class teacher updated." })
      await classes.reload()
    } catch (e) {
      setMsg({ err: errorText(e) })
    }
  }

  const teacherOptions = (
    <>
      <option value="">No class teacher yet</option>
      {teachers.rows.map((teacher) => (
        <option key={teacher.id} value={teacher.id}>
          {teacher.name}
        </option>
      ))}
    </>
  )

  return (
    <>
      <h3 style={heading}>Classes</h3>
      <div className="admin-actions">
        <button className="primary-button" onClick={() => setOpen(!open)} disabled={years.rows.length === 0}>
          <Plus size={15} /> {open ? "Close" : "Add class"}
        </button>
        {years.rows.length === 0 && <span className="save-message">Add an academic year first.</span>}
        <Note ok={msg.ok} error={msg.err} />
      </div>
      {open && (
        <form className="content-card record-form" onSubmit={add}>
          <label>
            <span>Grade (for example Grade 4)</span>
            <input required value={form.grade} onChange={(e) => setForm({ ...form, grade: e.target.value })} />
          </label>
          <label>
            <span>Stream (optional, for example East)</span>
            <input value={form.stream} onChange={(e) => setForm({ ...form, stream: e.target.value })} />
          </label>
          <label>
            <span>Academic year</span>
            <select required value={form.academicYear} onChange={(e) => setForm({ ...form, academicYear: e.target.value })}>
              <option value="">Choose a year</option>
              {years.rows.map((year) => (
                <option key={year.id} value={year.id}>
                  {year.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>Class teacher</span>
            <select value={form.classTeacher} onChange={(e) => setForm({ ...form, classTeacher: e.target.value })}>
              {teacherOptions}
            </select>
          </label>
          <label>
            <span>Capacity (optional)</span>
            <input type="number" min={1} value={form.capacity} onChange={(e) => setForm({ ...form, capacity: e.target.value })} />
          </label>
          <button className="primary-button" type="submit">
            Add class
          </button>
        </form>
      )}
      <div className="content-card">
        <Empty loading={classes.loading} error={classes.error} count={classes.rows.length} text="No classes yet." />
        {classes.rows.length > 0 && (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Class</th>
                  <th>Year</th>
                  <th>Class teacher</th>
                  <th>Capacity</th>
                </tr>
              </thead>
              <tbody>
                {classes.rows.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <strong>{item.name}</strong>
                    </td>
                    <td>{nameOf(item.academicYear)}</td>
                    <td>
                      <select className="table-select" value={relId(item.classTeacher) ?? ""} onChange={(e) => void setClassTeacher(item.id, e.target.value)}>
                        {teacherOptions}
                      </select>
                    </td>
                    <td>{item.capacity ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  )
}

export function TermsClassesLive() {
  const years = useRows<Year>("academic-years", "limit=100&depth=0&sort=-startDate")
  const terms = useRows<Term>("terms", "limit=300&depth=1&sort=startDate")
  const classes = useRows<ClassRow>("classes", "limit=300&depth=1&sort=name")
  const teachers = useRows<UserOption>("users", TEACHER_QUERY)
  return (
    <Page title="Terms & classes" subtitle="Set up academic years, terms and classes, and choose each class teacher.">
      <YearsSection years={years} />
      <TermsSection years={years} terms={terms} />
      <ClassesSection years={years} classes={classes} teachers={teachers} />
    </Page>
  )
}

/* ------------------------------ Learning areas ------------------------------ */

function SubjectsSection({ subjects }: { subjects: ReturnType<typeof useRows<SubjectRow>> }) {
  const [open, setOpen] = useState(false)
  const [msg, setMsg] = useState<Msg>({})
  const blank = { name: "", code: "", department: "" }
  const [form, setForm] = useState(blank)

  async function add(event: FormEvent) {
    event.preventDefault()
    try {
      await apiCreate("subjects", { ...form, department: form.department || undefined })
      setMsg({ ok: `${form.name} added.` })
      setForm(blank)
      setOpen(false)
      await subjects.reload()
    } catch (e) {
      setMsg({ err: errorText(e) })
    }
  }
  async function toggle(subject: SubjectRow) {
    try {
      await apiUpdate("subjects", subject.id, { isActive: !subject.isActive })
      setMsg({ ok: subject.isActive ? `${subject.name} switched off.` : `${subject.name} switched on.` })
      await subjects.reload()
    } catch (e) {
      setMsg({ err: errorText(e) })
    }
  }

  return (
    <>
      <h3 style={heading}>Learning areas</h3>
      <div className="admin-actions">
        <button className="primary-button" onClick={() => setOpen(!open)}>
          <Plus size={15} /> {open ? "Close" : "Add learning area"}
        </button>
        <Note ok={msg.ok} error={msg.err} />
      </div>
      {open && (
        <form className="content-card record-form" onSubmit={add}>
          <label>
            <span>Name (for example Mathematics)</span>
            <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </label>
          <label>
            <span>Short code (for example MATH)</span>
            <input required value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} />
          </label>
          <label>
            <span>Department (optional)</span>
            <input value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} />
          </label>
          <button className="primary-button" type="submit">
            Add learning area
          </button>
        </form>
      )}
      <div className="content-card">
        <Empty loading={subjects.loading} error={subjects.error} count={subjects.rows.length} text="No learning areas yet." />
        {subjects.rows.length > 0 && (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Name</th>
                  <th>Department</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {subjects.rows.map((subject) => (
                  <tr key={subject.id}>
                    <td>{subject.code}</td>
                    <td>
                      <strong>{subject.name}</strong>
                    </td>
                    <td>{subject.department || "—"}</td>
                    <td>
                      <button className="secondary-button" onClick={() => void toggle(subject)}>
                        {subject.isActive ? "Active · switch off" : "Off · switch on"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  )
}

function AssignmentsSection({
  subjects,
  teachers,
}: {
  subjects: ReturnType<typeof useRows<SubjectRow>>
  teachers: ReturnType<typeof useRows<UserOption>>
}) {
  const assignments = useRows<AssignmentRow>("teacher-assignments", "limit=500&depth=1&sort=-createdAt")
  const classes = useRows<ClassRow>("classes", "limit=300&depth=0&sort=name")
  const years = useRows<Year>("academic-years", "limit=100&depth=0&sort=-startDate")
  const [open, setOpen] = useState(false)
  const [msg, setMsg] = useState<Msg>({})
  const blank = { teacher: "", class: "", subject: "", academicYear: "" }
  const [form, setForm] = useState(blank)
  const ready = teachers.rows.length > 0 && classes.rows.length > 0 && subjects.rows.length > 0 && years.rows.length > 0

  async function add(event: FormEvent) {
    event.preventDefault()
    try {
      await apiCreate("teacher-assignments", {
        teacher: Number(form.teacher),
        class: Number(form.class),
        subject: Number(form.subject),
        academicYear: Number(form.academicYear),
      })
      setMsg({ ok: "Teaching assignment saved." })
      setForm(blank)
      setOpen(false)
      await assignments.reload()
    } catch (e) {
      setMsg({ err: errorText(e) })
    }
  }
  async function remove(id: number) {
    if (!window.confirm("Remove this teaching assignment? The teacher will lose access to that class.")) return
    try {
      await apiDelete("teacher-assignments", id)
      setMsg({ ok: "Assignment removed." })
      await assignments.reload()
    } catch (e) {
      setMsg({ err: errorText(e) })
    }
  }

  return (
    <>
      <h3 style={heading}>Who teaches what</h3>
      <div className="admin-actions">
        <button className="primary-button" onClick={() => setOpen(!open)} disabled={!ready}>
          <Plus size={15} /> {open ? "Close" : "Assign teacher"}
        </button>
        {!ready && <span className="save-message">You need a teacher, a class, a learning area and an academic year first.</span>}
        <Note ok={msg.ok} error={msg.err} />
      </div>
      {open && (
        <form className="content-card record-form" onSubmit={add}>
          <label>
            <span>Teacher</span>
            <select required value={form.teacher} onChange={(e) => setForm({ ...form, teacher: e.target.value })}>
              <option value="">Choose a teacher</option>
              {teachers.rows.map((teacher) => (
                <option key={teacher.id} value={teacher.id}>
                  {teacher.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>Class</span>
            <select required value={form.class} onChange={(e) => setForm({ ...form, class: e.target.value })}>
              <option value="">Choose a class</option>
              {classes.rows.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>Learning area</span>
            <select required value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })}>
              <option value="">Choose a learning area</option>
              {subjects.rows.map((subject) => (
                <option key={subject.id} value={subject.id}>
                  {subject.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>Academic year</span>
            <select required value={form.academicYear} onChange={(e) => setForm({ ...form, academicYear: e.target.value })}>
              <option value="">Choose a year</option>
              {years.rows.map((year) => (
                <option key={year.id} value={year.id}>
                  {year.name}
                </option>
              ))}
            </select>
          </label>
          <button className="primary-button" type="submit">
            Save assignment
          </button>
        </form>
      )}
      <div className="content-card">
        <Empty loading={assignments.loading} error={assignments.error} count={assignments.rows.length} text="No teaching assignments yet." />
        {assignments.rows.length > 0 && (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Teacher</th>
                  <th>Class</th>
                  <th>Learning area</th>
                  <th>Year</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {assignments.rows.map((row) => (
                  <tr key={row.id}>
                    <td>
                      <strong>{nameOf(row.teacher)}</strong>
                    </td>
                    <td>{nameOf(row.class)}</td>
                    <td>{nameOf(row.subject)}</td>
                    <td>{nameOf(row.academicYear)}</td>
                    <td>
                      <button className="secondary-button" onClick={() => void remove(row.id)}>
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  )
}

export function LearningAreasLive() {
  const subjects = useRows<SubjectRow>("subjects", "limit=300&depth=0&sort=name")
  const teachers = useRows<UserOption>("users", TEACHER_QUERY)
  return (
    <Page title="Learning areas" subtitle="The subjects taught at the school, and which teacher teaches each one in each class.">
      <SubjectsSection subjects={subjects} />
      <AssignmentsSection subjects={subjects} teachers={teachers} />
    </Page>
  )
}