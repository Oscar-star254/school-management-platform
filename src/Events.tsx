import { useState } from "react"

import type { FormEvent } from "react"

import { CalendarDays, MapPin, Plus } from "lucide-react"

import { apiCreate, apiDelete, apiUploadMedia } from "./api"

import { Empty, Note, Page, errorText, nameOf } from "./AdminPeople"

import type { Msg } from "./AdminPeople"

import { Field, useFind } from "./LiveShell"

type EventDoc = {
  id: number

  title: string

  type?: string

  startDate: string

  endDate?: string | null

  class?: unknown

  description?: string | null

  location?: string | null

  posterUrl?: string | null

  posterAlt?: string | null
}

type ClassDoc = { id: number; name?: string }

type EventForm = {
  title: string
  type: string
  startDate: string
  endDate: string
  classId: string
  description: string
  location: string
}

const blank: EventForm = {
  title: "",
  type: "event",
  startDate: "",
  endDate: "",
  classId: "",
  description: "",
  location: "",
}

const dateLabel = (date: string) =>
  new Date(date).toLocaleDateString("en-KE", { dateStyle: "long" })

const kindLabel: Record<string, string> = {
  event: "School event",
  exam: "Examination",
  holiday: "Holiday",
  deadline: "Deadline",
}

export function EventsPanel({ manage = false }: { manage?: boolean }) {
  const events = useFind<EventDoc>("events", "limit=200&depth=1&sort=startDate")

  const classes = useFind<ClassDoc>("classes", manage ? "limit=300&depth=0&sort=name" : null)

  const [form, setForm] = useState(blank)

  const [poster, setPoster] = useState<File | null>(null)

  const [open, setOpen] = useState(false)

  const [busy, setBusy] = useState(false)

  const [msg, setMsg] = useState<Msg>({})

  const shown = events.rows.filter(
    (event) => new Date(event.endDate ?? event.startDate).getTime() >= Date.now() - 86_400_000,
  )

  async function save(event: FormEvent) {
    event.preventDefault()

    setBusy(true)

    setMsg({})

    try {
      const uploaded = poster ? await apiUploadMedia(poster, poster.name) : null

      await apiCreate("events", {
        title: form.title,

        type: form.type,

        startDate: `${form.startDate}T00:00:00.000Z`,

        endDate: form.endDate ? `${form.endDate}T23:59:59.000Z` : null,

        class: form.classId ? Number(form.classId) : null,

        description: form.description || null,

        location: form.location || null,

        posterUrl: uploaded?.url ?? null,

        posterAlt: uploaded ? poster?.name : null,
      })

      setMsg({ ok: "Event published to the school events panels." })

      setForm(blank)

      setPoster(null)

      setOpen(false)

      await events.reload()
    } catch (error) {
      setMsg({ err: errorText(error) })
    } finally {
      setBusy(false)
    }
  }

  async function remove(row: EventDoc) {
    if (!window.confirm(`Delete “${row.title}”?`)) return

    try {
      await apiDelete("events", row.id)

      setMsg({ ok: "Event deleted." })

      await events.reload()
    } catch (error) {
      setMsg({ err: errorText(error) })
    }
  }

  return (
    <Page
      title="School events"
      subtitle="A visual calendar for school events, activities, exams, and important dates — separate from notices."
    >
      {manage && (
        <div className="admin-actions">
          <button className="primary-button" onClick={() => setOpen(!open)}>
            <Plus size={15} /> {open ? "Close" : "Add event"}
          </button>
          <Note ok={msg.ok} error={msg.err} />
        </div>
      )}
      {!manage && <Note ok={msg.ok} error={msg.err} />}
      {manage && open && (
        <form className="content-card record-form" onSubmit={(event) => void save(event)}>
          <Field label="Event title">
            <input
              required
              value={form.title}
              onChange={(event) => setForm({ ...form, title: event.target.value })}
            />
          </Field>
          <Field label="Type">
            <select
              value={form.type}
              onChange={(event) => setForm({ ...form, type: event.target.value })}
            >
              {Object.entries(kindLabel).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Start date">
            <input
              required
              type="date"
              value={form.startDate}
              onChange={(event) => setForm({ ...form, startDate: event.target.value })}
            />
          </Field>
          <Field label="End date (optional)">
            <input
              type="date"
              min={form.startDate || undefined}
              value={form.endDate}
              onChange={(event) => setForm({ ...form, endDate: event.target.value })}
            />
          </Field>
          <Field label="Audience">
            <select
              value={form.classId}
              onChange={(event) => setForm({ ...form, classId: event.target.value })}
            >
              <option value="">Whole school</option>
              {classes.rows.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Location or venue">
            <input
              value={form.location}
              placeholder="e.g. Main hall, school grounds"
              onChange={(event) => setForm({ ...form, location: event.target.value })}
            />
          </Field>
          <Field label="Event details">
            <textarea
              rows={4}
              value={form.description}
              onChange={(event) => setForm({ ...form, description: event.target.value })}
            />
          </Field>
          <Field label="Poster image (optional)">
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={(event) => setPoster(event.target.files?.[0] ?? null)}
            />
          </Field>
          <button className="primary-button" type="submit" disabled={busy}>
            {busy ? "Publishing…" : "Publish event"}
          </button>
        </form>
      )}
      <Empty
        loading={events.loading}
        error={events.error}
        count={shown.length}
        text="There are no upcoming school events."
      />
      {shown.length > 0 && (
        <div className="event-grid">
          {shown.map((row) => (
            <article key={row.id} className="event-card">
              {row.posterUrl && (
                <img
                  src={row.posterUrl}
                  alt={row.posterAlt || `${row.title} poster`}
                  loading="lazy"
                />
              )}
              <div className="event-card-body">
                <span className="event-chip">{kindLabel[row.type ?? ""] ?? "School event"}</span>
                <h3 style={{ marginTop: 10 }}>{row.title}</h3>
                {row.description && <p>{row.description}</p>}
                <div className="event-meta">
                  <span>
                    <CalendarDays size={14} /> {dateLabel(row.startDate)}
                    {row.endDate ? ` – ${dateLabel(row.endDate)}` : ""}
                  </span>
                  {row.location && (
                    <span>
                      <MapPin size={14} /> {row.location}
                    </span>
                  )}
                  <span>{row.class ? nameOf(row.class) : "Whole school"}</span>
                </div>
                {manage && (
                  <button
                    className="secondary-button"
                    style={{ marginTop: 14 }}
                    onClick={() => void remove(row)}
                  >
                    Delete event
                  </button>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </Page>
  )
}
