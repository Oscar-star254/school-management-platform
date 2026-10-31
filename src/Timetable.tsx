import { useState } from "react"

import type { FormEvent } from "react"

import { Plus } from "lucide-react"

import { apiCreate, apiDelete, apiUpdate, getCurrentUser } from "./api"

import { Empty, Note, Page, errorText, nameOf, relId } from "./AdminPeople"

import type { Msg } from "./AdminPeople"

import { Field, Table, todayLocal, useFind } from "./LiveShell"

export const DAYS: [string, string][] = [
  ["mon", "Monday"],

  ["tue", "Tuesday"],

  ["wed", "Wednesday"],

  ["thu", "Thursday"],

  ["fri", "Friday"],
]

const EVENT_TYPES: [string, string][] = [
  ["event", "School event"],

  ["exam", "Examination"],

  ["holiday", "Holiday"],

  ["deadline", "Deadline"],
]

const typeLabel = (value?: string) => EVENT_TYPES.find(([key]) => key === value)?.[1] ?? "Event"

const heading = { margin: "22px 0 10px", fontSize: 15 } as const

const dayKey = () => ["sun", "mon", "tue", "wed", "thu", "fri", "sat"][new Date().getDay()]

const dateOnly = (iso?: string | null) => (iso ? iso.slice(0, 10) : "")

export type Slot = {
  id: number

  class?: unknown

  subject?: unknown

  teacher?: unknown

  dayOfWeek: string

  startTime: string

  endTime: string

  room?: string | null
}

export type EventRow = {
  id: number

  title: string

  type?: string

  startDate: string

  endDate?: string | null

  class?: unknown

  description?: string | null
}

/* ----------------------------- shared displays ----------------------------- */

/** The week at a glance, one card per day. Today is outlined. */

export function WeekGrid({
  slots,
  showClass,
  showTeacher,
}: {
  slots: Slot[]
  showClass?: boolean
  showTeacher?: boolean
}) {
  const today = dayKey()

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
        gap: 12,
      }}
    >
      {DAYS.map(([key, label]) => {
        const list = slots
          .filter((slot) => slot.dayOfWeek === key)
          .sort((a, b) => a.startTime.localeCompare(b.startTime))

        return (
          <div
            key={key}
            className="content-card"
            style={{
              padding: 12,
              outline: key === today ? "2px solid var(--primary)" : undefined,
            }}
          >
            <strong>
              {label}
              {key === today ? " (today)" : ""}
            </strong>
            {list.length === 0 ? (
              <p style={{ margin: "8px 0", opacity: 0.7 }}>No lessons</p>
            ) : (
              list.map((slot) => (
                <div key={slot.id} style={{ margin: "10px 0" }}>
                  <strong>
                    {slot.startTime}–{slot.endTime}
                  </strong>
                  <br />
                  {nameOf(slot.subject)}
                  {showClass ? ` · ${nameOf(slot.class)}` : ""}
                  {showTeacher ? ` · ${nameOf(slot.teacher)}` : ""}
                  {slot.room ? ` · ${slot.room}` : ""}
                </div>
              ))
            )}
          </div>
        )
      })}
    </div>
  )
}

export function EventsList({
  events,
  onDelete,
}: {
  events: EventRow[]
  onDelete?: (event: EventRow) => void
}) {
  const upcoming = events

    .filter((event) => dateOnly(event.endDate ?? event.startDate) >= todayLocal())

    .sort((a, b) => a.startDate.localeCompare(b.startDate))

  if (upcoming.length === 0) return <p className="save-message">No upcoming events or exams.</p>

  return (
    <div className="content-card">
      <Table heads={["When", "What", "Type", "For", ...(onDelete ? [""] : [])]}>
        {upcoming.map((event) => (
          <tr key={event.id}>
            <td>
              {dateOnly(event.startDate)}
              {event.endDate && dateOnly(event.endDate) !== dateOnly(event.startDate)
                ? ` to ${dateOnly(event.endDate)}`
                : ""}
            </td>
            <td>
              <strong>{event.title}</strong>
              {event.description ? <div>{event.description}</div> : null}
            </td>
            <td>{typeLabel(event.type)}</td>
            <td>{event.class ? nameOf(event.class) : "Whole school"}</td>
            {onDelete && (
              <td>
                <button className="secondary-button" onClick={() => onDelete(event)}>
                  Delete
                </button>
              </td>
            )}
          </tr>
        ))}
      </Table>
    </div>
  )
}

/** Weekly timetable and upcoming events for the signed-in teacher or a learner's class. */

export function TimetableBody({
  classId,
  showClass,
  showTeacher,
}: {
  classId?: number
  showClass?: boolean
  showTeacher?: boolean
}) {
  const slots = useFind<Slot>("timetable-slots", "limit=500&depth=1&sort=startTime")

  const events = useFind<EventRow>("events", "limit=200&depth=1&sort=startDate")

  const rows = classId ? slots.rows.filter((slot) => relId(slot.class) === classId) : slots.rows

  const relevant = events.rows.filter(
    (event) => !classId || !event.class || relId(event.class) === classId,
  )

  return (
    <>
      <Empty
        loading={slots.loading}
        error={slots.error}
        count={rows.length}
        text="No lessons have been timetabled yet."
      />
      {rows.length > 0 && <WeekGrid slots={rows} showClass={showClass} showTeacher={showTeacher} />}
      <h3 style={heading}>Upcoming events and exams</h3>
      {events.error ? (
        <p style={{ color: "#b3261e" }}>{events.error}</p>
      ) : (
        <EventsList events={relevant} />
      )}
    </>
  )
}

export function TimetableView(props: {
  classId?: number
  showClass?: boolean
  showTeacher?: boolean
}) {
  return (
    <Page title="Timetable" subtitle="Your week, and the events and exams coming up.">
      <TimetableBody {...props} />
    </Page>
  )
}

/* ---------------------------------- admin ---------------------------------- */

type Option = { id: number; name?: string; classTeacher?: unknown }

type AssignmentRow = {
  id: number
  class?: unknown
  subject?: unknown
  teacher?: unknown
}

export function TimetableAdmin({ classTeacher = false }: { classTeacher?: boolean }) {
  const allClasses = useFind<Option>("classes", "limit=300&depth=1&sort=name")

  const userId = getCurrentUser()?.id

  const classes = classTeacher
    ? {
        ...allClasses,
        rows: allClasses.rows.filter((item) => relId(item.classTeacher) === userId),
      }
    : allClasses

  const slots = useFind<Slot>("timetable-slots", "limit=1000&depth=1&sort=startTime")

  const events = useFind<EventRow>("events", "limit=300&depth=1&sort=startDate")

  const [picked, setPicked] = useState("")

  const classId = picked || String(classes.rows[0]?.id ?? "")

  const assignments = useFind<AssignmentRow>(
    "teacher-assignments",
    classId ? `limit=200&depth=1&where[class][equals]=${classId}` : null,
  )

  const [open, setOpen] = useState(false)

  const [msg, setMsg] = useState<Msg>({})

  const blank = {
    id: 0,
    assignment: "",
    dayOfWeek: "mon",
    startTime: "",
    endTime: "",
    room: "",
  }

  const [form, setForm] = useState(blank)

  const blankEvent = {
    title: "",
    type: "event",
    startDate: "",
    endDate: "",
    classId: "",
    description: "",
  }

  const [eventOpen, setEventOpen] = useState(false)

  const [eventForm, setEventForm] = useState(blankEvent)

  const shown = slots.rows.filter((slot) => String(relId(slot.class)) === classId)

  function edit(slot: Slot) {
    const match = assignments.rows.find(
      (a) => relId(a.subject) === relId(slot.subject) && relId(a.teacher) === relId(slot.teacher),
    )

    setForm({
      id: slot.id,
      assignment: String(match?.id ?? ""),
      dayOfWeek: slot.dayOfWeek,
      startTime: slot.startTime,
      endTime: slot.endTime,
      room: slot.room ?? "",
    })

    setOpen(true)
  }

  async function saveLesson(event: FormEvent) {
    event.preventDefault()

    const chosen = assignments.rows.find((a) => String(a.id) === form.assignment)

    if (!chosen) {
      setMsg({ err: "Choose the subject and teacher." })

      return
    }

    const data = {
      class: relId(chosen.class),

      subject: relId(chosen.subject),

      teacher: relId(chosen.teacher),

      dayOfWeek: form.dayOfWeek,

      startTime: form.startTime,

      endTime: form.endTime,

      room: form.room || null,
    }

    try {
      if (form.id) await apiUpdate("timetable-slots", form.id, data)
      else await apiCreate("timetable-slots", data)

      setMsg({ ok: form.id ? "Lesson updated." : "Lesson added." })

      setForm(blank)

      setOpen(false)

      await slots.reload()
    } catch (e) {
      setMsg({ err: errorText(e) })
    }
  }

  async function removeLesson(slot: Slot) {
    if (!window.confirm("Remove this lesson from the timetable?")) return

    try {
      await apiDelete("timetable-slots", slot.id)

      setMsg({ ok: "Lesson removed." })

      await slots.reload()
    } catch (e) {
      setMsg({ err: errorText(e) })
    }
  }

  async function addEvent(event: FormEvent) {
    event.preventDefault()

    try {
      await apiCreate("events", {
        title: eventForm.title,

        type: eventForm.type,

        startDate: `${eventForm.startDate}T00:00:00.000Z`,

        endDate: eventForm.endDate ? `${eventForm.endDate}T00:00:00.000Z` : null,

        class: eventForm.classId ? Number(eventForm.classId) : null,

        description: eventForm.description || null,
      })

      setMsg({ ok: "Event added." })

      setEventForm(blankEvent)

      setEventOpen(false)

      await events.reload()
    } catch (e) {
      setMsg({ err: errorText(e) })
    }
  }

  async function removeEvent(row: EventRow) {
    if (!window.confirm(`Delete “${row.title}”?`)) return

    try {
      await apiDelete("events", row.id)

      setMsg({ ok: "Event deleted." })

      await events.reload()
    } catch (e) {
      setMsg({ err: errorText(e) })
    }
  }

  return (
    <Page
      title="Timetable"
      subtitle={
        classTeacher
          ? "Create and manage the timetable for your assigned class."
          : "View each class timetable. Class teachers manage their own schedules."
      }
    >
      <div className="admin-actions">
        <select
          className="table-select"
          value={classId}
          onChange={(e) => setPicked(e.target.value)}
        >
          {classes.rows.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
        {classTeacher && (
          <button
            className="primary-button"
            onClick={() => {
              setOpen(!open)
              setForm(blank)
            }}
            disabled={!classId}
          >
            <Plus size={15} /> {open ? "Close" : "Add lesson"}
          </button>
        )}
        {!classTeacher && (
          <button className="secondary-button" onClick={() => setEventOpen(!eventOpen)}>
            <Plus size={15} /> {eventOpen ? "Close" : "Add event or exam"}
          </button>
        )}
        <Note ok={msg.ok} error={msg.err} />
      </div>
      {classTeacher && open && (
        <form className="content-card record-form" onSubmit={saveLesson}>
          <Field label="Subject and teacher">
            <select
              required
              value={form.assignment}
              onChange={(e) => setForm({ ...form, assignment: e.target.value })}
            >
              <option value="">Choose</option>
              {assignments.rows.map((a) => (
                <option key={a.id} value={a.id}>
                  {nameOf(a.subject)} · {nameOf(a.teacher)}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Day">
            <select
              value={form.dayOfWeek}
              onChange={(e) => setForm({ ...form, dayOfWeek: e.target.value })}
            >
              {DAYS.map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Starts (for example 08:30)">
            <input
              required
              placeholder="08:30"
              value={form.startTime}
              onChange={(e) => setForm({ ...form, startTime: e.target.value })}
            />
          </Field>
          <Field label="Ends (for example 09:10)">
            <input
              required
              placeholder="09:10"
              value={form.endTime}
              onChange={(e) => setForm({ ...form, endTime: e.target.value })}
            />
          </Field>
          <Field label="Room (optional)">
            <input value={form.room} onChange={(e) => setForm({ ...form, room: e.target.value })} />
          </Field>
          <button className="primary-button" type="submit">
            {form.id ? "Save lesson" : "Add lesson"}
          </button>
          {assignments.rows.length === 0 && !assignments.loading && (
            <p className="save-message">
              No teachers are assigned to this class yet. Assign them first under Learning areas,
              then Who teaches what.
            </p>
          )}
        </form>
      )}
      {!classTeacher && eventOpen && (
        <form className="content-card record-form" onSubmit={addEvent}>
          <Field label="Title">
            <input
              required
              value={eventForm.title}
              onChange={(e) => setEventForm({ ...eventForm, title: e.target.value })}
            />
          </Field>
          <Field label="Type">
            <select
              value={eventForm.type}
              onChange={(e) => setEventForm({ ...eventForm, type: e.target.value })}
            >
              {EVENT_TYPES.map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Starts">
            <input
              required
              type="date"
              value={eventForm.startDate}
              onChange={(e) => setEventForm({ ...eventForm, startDate: e.target.value })}
            />
          </Field>
          <Field label="Ends (optional)">
            <input
              type="date"
              value={eventForm.endDate}
              onChange={(e) => setEventForm({ ...eventForm, endDate: e.target.value })}
            />
          </Field>
          <Field label="For">
            <select
              value={eventForm.classId}
              onChange={(e) => setEventForm({ ...eventForm, classId: e.target.value })}
            >
              <option value="">Whole school</option>
              {classes.rows.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Details (optional)">
            <input
              value={eventForm.description}
              onChange={(e) => setEventForm({ ...eventForm, description: e.target.value })}
            />
          </Field>
          <button className="primary-button" type="submit">
            Add to the calendar
          </button>
        </form>
      )}
      {classTeacher && classes.rows.length === 0 && !classes.loading && (
        <p className="content-card" style={{ padding: 16 }}>
          No class is assigned to your account as class teacher.
        </p>
      )}
      <Empty
        loading={slots.loading}
        error={slots.error}
        count={shown.length}
        text={
          classTeacher
            ? "No lessons for this class yet. Add the first one."
            : "No timetable lessons have been added to this class yet."
        }
      />
      {shown.length > 0 && (
        <>
          <WeekGrid slots={shown} showTeacher />
          <h3 style={heading}>Lessons</h3>
          <div className="content-card">
            <Table heads={["Day", "Time", "Subject", "Teacher", "Room", ""]}>
              {[...shown]

                .sort(
                  (a, b) =>
                    DAYS.findIndex(([k]) => k === a.dayOfWeek) -
                      DAYS.findIndex(([k]) => k === b.dayOfWeek) ||
                    a.startTime.localeCompare(b.startTime),
                )

                .map((slot) => (
                  <tr key={slot.id}>
                    <td>{DAYS.find(([k]) => k === slot.dayOfWeek)?.[1]}</td>
                    <td>
                      {slot.startTime}–{slot.endTime}
                    </td>
                    <td>
                      <strong>{nameOf(slot.subject)}</strong>
                    </td>
                    <td>{nameOf(slot.teacher)}</td>
                    <td>{slot.room || "—"}</td>
                    {classTeacher && (
                      <td>
                        <button className="secondary-button" onClick={() => edit(slot)}>
                          Edit
                        </button>{" "}
                        <button
                          className="secondary-button"
                          onClick={() => void removeLesson(slot)}
                        >
                          Remove
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
            </Table>
          </div>
        </>
      )}
      <h3 style={heading}>School calendar</h3>
      {events.error ? (
        <p style={{ color: "#b3261e" }}>{events.error}</p>
      ) : (
        <EventsList
          events={events.rows}
          onDelete={classTeacher ? undefined : (row) => void removeEvent(row)}
        />
      )}
    </Page>
  )
}
