import { useState } from "react"
import type { FormEvent } from "react"
import { Plus } from "lucide-react"

import { apiLearners, apiRegisterFamily, apiUpdate } from "./api"
import type { FamilyRegistration } from "./api"
import { Empty, Note, Page, errorText, nameOf, relId } from "./AdminPeople"
import type { Msg } from "./AdminPeople"
import { Field, Table, useFind } from "./LiveShell"
import { hydrateLearners } from "./schoolStore"

const RELATIONSHIPS: [string, string][] = [
  ["mother", "Mother"],
  ["father", "Father"],
  ["guardian", "Guardian"],
  ["other", "Other"],
]
const heading = { margin: "22px 0 10px", fontSize: 15 } as const

type StudentRow = { id: number; admissionNumber?: string; name?: string; status?: string; currentClass?: unknown }
type ClassOpt = { id: number; name?: string }
type GuardianOpt = { id: number; name?: string; phone?: string }
type Slot = { mode: "none" | "new" | "existing"; name: string; phone: string; email: string; existingId: string; relationship: string }
const slot = (mode: Slot["mode"]): Slot => ({ mode, name: "", phone: "", email: "", existingId: "", relationship: "guardian" })

/* ------------------------------ guardian slot ------------------------------ */

function GuardianSlot({
  index,
  value,
  guardians,
  onChange,
}: {
  index: number
  value: Slot
  guardians: GuardianOpt[]
  onChange: (next: Slot) => void
}) {
  const set = (patch: Partial<Slot>) => onChange({ ...value, ...patch })
  return (
    <>
      <h3 style={{ ...heading, gridColumn: "1 / -1" }}>
        Guardian {index + 1} {index === 0 ? "(required)" : "(optional, in case the first is not reachable)"}
      </h3>
      <Field label="Guardian details">
        <select value={value.mode} onChange={(e) => set({ mode: e.target.value as Slot["mode"] })}>
          {index === 1 && <option value="none">No second guardian</option>}
          <option value="new">Add a new guardian</option>
          <option value="existing">An existing guardian (for example a sibling’s parent)</option>
        </select>
      </Field>
      {value.mode === "existing" && (
        <Field label="Choose the guardian">
          <select required value={value.existingId} onChange={(e) => set({ existingId: e.target.value })}>
            <option value="">Choose</option>
            {guardians.map((guardian) => (
              <option key={guardian.id} value={guardian.id}>
                {guardian.name} {guardian.phone ? `(${guardian.phone})` : ""}
              </option>
            ))}
          </select>
        </Field>
      )}
      {value.mode === "new" && (
        <>
          <Field label="Full name">
            <input required value={value.name} onChange={(e) => set({ name: e.target.value })} />
          </Field>
          <Field label="Phone">
            <input value={value.phone} placeholder="254700123456" onChange={(e) => set({ phone: e.target.value })} />
          </Field>
          <Field label="Email (optional)">
            <input type="email" value={value.email} onChange={(e) => set({ email: e.target.value })} />
          </Field>
        </>
      )}
      {value.mode !== "none" && (
        <Field label="Relationship to the learner">
          <select value={value.relationship} onChange={(e) => set({ relationship: e.target.value })}>
            {RELATIONSHIPS.map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </Field>
      )}
    </>
  )
}

/* --------------------------------- Learners --------------------------------- */

export function LearnersPage() {
  const learners = useFind<StudentRow>("students", "limit=1000&depth=1&sort=name")
  const classes = useFind<ClassOpt>("classes", "limit=300&depth=0&sort=name")
  const guardians = useFind<GuardianOpt>("guardians", "limit=2000&depth=0&sort=name")
  const [open, setOpen] = useState(false)
  const [msg, setMsg] = useState<Msg>({})
  const [busy, setBusy] = useState(false)
  const [search, setSearch] = useState("")
  const [done, setDone] = useState<{ name: string; admission: string; accounts: { name: string; signIn: string }[] } | null>(null)
  const blank = { firstName: "", lastName: "", dateOfBirth: "", classId: "", password: "", studentLogin: false, studentEmail: "" }
  const [form, setForm] = useState(blank)
  const [slots, setSlots] = useState<[Slot, Slot]>([slot("new"), slot("none")])

  const newGuardians = slots.some((s) => s.mode === "new")
  const needsPassword = newGuardians || form.studentLogin

  async function refresh() {
    await learners.reload()
    await guardians.reload()
    hydrateLearners(await apiLearners().catch(() => []))
  }

  async function register(event: FormEvent) {
    event.preventDefault()
    const chosen = slots.filter((s) => s.mode !== "none")
    if (chosen.some((s) => s.mode === "existing" && !s.existingId)) {
      setMsg({ err: "Choose the existing guardian, or switch that guardian to “Add a new guardian”." })
      return
    }
    const payload: FamilyRegistration = {
      firstName: form.firstName,
      lastName: form.lastName,
      dateOfBirth: form.dateOfBirth || undefined,
      classId: form.classId ? Number(form.classId) : undefined,
      password: needsPassword ? form.password : undefined,
      createStudentLogin: form.studentLogin || undefined,
      studentEmail: form.studentLogin && form.studentEmail ? form.studentEmail : undefined,
      guardians: chosen.map((s) =>
        s.mode === "existing"
          ? { existingId: Number(s.existingId), relationship: s.relationship }
          : { name: s.name, phone: s.phone || undefined, email: s.email || undefined, relationship: s.relationship },
      ),
    }
    setBusy(true)
    try {
      const result = await apiRegisterFamily(payload)
      setDone({ name: `${form.firstName} ${form.lastName}`, admission: result.admissionNumber, accounts: result.accounts })
      setMsg({ ok: `${form.firstName} ${form.lastName} registered as ${result.admissionNumber}.` })
      setForm(blank)
      setSlots([slot("new"), slot("none")])
      setOpen(false)
      await refresh()
    } catch (e) {
      setMsg({ err: errorText(e) })
    }
    setBusy(false)
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

  const shown = learners.rows.filter((row) => {
    const text = `${row.name ?? ""} ${row.admissionNumber ?? ""}`.toLowerCase()
    return text.includes(search.trim().toLowerCase())
  })

  return (
    <Page title="Learners" subtitle="Register a learner together with their guardians. Admission numbers are created automatically.">
      <div className="admin-actions">
        <button className="primary-button" onClick={() => { setOpen(!open); setDone(null) }}>
          <Plus size={15} /> {open ? "Close registration" : "Register learner"}
        </button>
        <input value={search} placeholder="Search name or admission number" onChange={(e) => setSearch(e.target.value)} />
        <Note ok={msg.ok} error={msg.err} />
      </div>
      {done && (
        <div className="content-card" style={{ padding: 16 }}>
          <strong>
            {done.name} is registered as {done.admission}.
          </strong>
          <ul style={{ margin: "8px 0 8px 18px" }}>
            {done.accounts.map((account) => (
              <li key={account.name}>
                {account.name} signs in with <strong>{account.signIn}</strong>
              </li>
            ))}
          </ul>
          <p>
            Everyone can also sign in with the admission number <strong>{done.admission}</strong> and their own password. Give them the starting password you chose, and
            remember to share it privately.
          </p>
        </div>
      )}
      {open && (
        <form className="content-card record-form" onSubmit={register}>
          <h3 style={{ ...heading, gridColumn: "1 / -1" }}>Learner</h3>
          <Field label="First name">
            <input required value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} />
          </Field>
          <Field label="Last name">
            <input required value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} />
          </Field>
          <Field label="Date of birth (optional)">
            <input type="date" value={form.dateOfBirth} onChange={(e) => setForm({ ...form, dateOfBirth: e.target.value })} />
          </Field>
          <Field label="Class">
            <select value={form.classId} onChange={(e) => setForm({ ...form, classId: e.target.value })}>
              <option value="">No class yet</option>
              {classes.rows.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Also create a sign-in for the learner">
            <input type="checkbox" checked={form.studentLogin} onChange={(e) => setForm({ ...form, studentLogin: e.target.checked })} />
          </Field>
          {form.studentLogin && (
            <Field label="Learner email (optional, they can use the admission number)">
              <input type="email" value={form.studentEmail} onChange={(e) => setForm({ ...form, studentEmail: e.target.value })} />
            </Field>
          )}
          <GuardianSlot index={0} value={slots[0]} guardians={guardians.rows} onChange={(next) => setSlots([next, slots[1]])} />
          <GuardianSlot index={1} value={slots[1]} guardians={guardians.rows} onChange={(next) => setSlots([slots[0], next])} />
          {needsPassword && (
            <>
              <h3 style={{ ...heading, gridColumn: "1 / -1" }}>Sign-in</h3>
              <Field label="Starting password for the new sign-ins (at least 8 characters)">
                <input required type="password" minLength={8} autoComplete="new-password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
              </Field>
            </>
          )}
          <button className="primary-button" type="submit" disabled={busy}>
            {busy ? "Registering…" : "Register learner"}
          </button>
        </form>
      )}
      <div className="content-card">
        <Empty loading={learners.loading} error={learners.error} count={shown.length} text="No learners found." />
        {shown.length > 0 && (
          <Table heads={["Admission no.", "Learner", "Class", "Status"]}>
            {shown.map((learner) => (
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
          </Table>
        )}
      </div>
    </Page>
  )
}

/* --------------------------------- Guardians --------------------------------- */

type LinkRow = { id: number; relationship?: string; isPrimary?: boolean; guardian?: unknown; student?: unknown }
type Entry = { guardian: string; phone: string; email: string; relationship: string; learner: string; admission: string; primary: boolean }
type GuardianRow = { id: number; name?: string; phone?: string; email?: string }

const field = (value: unknown, key: string) =>
  value && typeof value === "object" ? ((value as Record<string, unknown>)[key] as string | undefined) ?? "" : ""
const realEmail = (value: string) => (value.endsWith("@family.invalid") ? "" : value)

/** Guardians listed under the class their child is in. Read-only: guardians are added when registering a learner. */
export function GuardiansByClass() {
  const links = useFind<LinkRow>("guardian-links", "limit=2000&depth=2")
  const guardians = useFind<GuardianRow>("guardians", "limit=2000&depth=0&sort=name")
  const [search, setSearch] = useState("")

  const groups = new Map<string, Entry[]>()
  const linked = new Set<number>()
  for (const link of links.rows) {
    const guardianId = relId(link.guardian)
    if (guardianId) linked.add(guardianId)
    const className = nameOf(field(link.student, "currentClass") ? (link.student as { currentClass?: unknown }).currentClass : undefined) || "No class yet"
    const entry: Entry = {
      guardian: field(link.guardian, "name"),
      phone: field(link.guardian, "phone"),
      email: realEmail(field(link.guardian, "email")),
      relationship: link.relationship ?? "",
      learner: field(link.student, "name"),
      admission: field(link.student, "admissionNumber"),
      primary: !!link.isPrimary,
    }
    groups.set(className, [...(groups.get(className) ?? []), entry])
  }
  for (const guardian of guardians.rows) {
    if (linked.has(guardian.id)) continue
    const entry: Entry = { guardian: guardian.name ?? "", phone: guardian.phone ?? "", email: realEmail(guardian.email ?? ""), relationship: "", learner: "", admission: "", primary: false }
    groups.set("Not linked to a learner", [...(groups.get("Not linked to a learner") ?? []), entry])
  }

  const needle = search.trim().toLowerCase()
  const sections = [...groups.entries()]
    .map(([className, entries]) => ({
      className,
      entries: entries
        .filter((e) => !needle || `${e.guardian} ${e.learner} ${e.admission} ${e.phone}`.toLowerCase().includes(needle))
        .sort((a, b) => a.learner.localeCompare(b.learner) || Number(b.primary) - Number(a.primary)),
    }))
    .filter((section) => section.entries.length > 0)
    .sort((a, b) => (a.className.startsWith("Not") || a.className.startsWith("No class") ? 1 : 0) - (b.className.startsWith("Not") || b.className.startsWith("No class") ? 1 : 0) || a.className.localeCompare(b.className))

  return (
    <Page title="Guardians" subtitle="Parents and guardians, listed by the class their child is in. Add guardians when you register a learner.">
      <div className="admin-actions">
        <input value={search} placeholder="Search guardian, learner or phone" onChange={(e) => setSearch(e.target.value)} />
      </div>
      <Empty loading={links.loading || guardians.loading} error={links.error || guardians.error} count={sections.length} text="No guardians yet. They are added when you register a learner." />
      {sections.map((section) => (
        <div key={section.className}>
          <h3 style={heading}>
            {section.className} ({section.entries.length})
          </h3>
          <div className="content-card">
            <Table heads={["Guardian", "Relationship", "Phone", "Email", "Learner"]}>
              {section.entries.map((entry, index) => (
                <tr key={`${entry.guardian}-${entry.admission}-${index}`}>
                  <td>
                    <strong>{entry.guardian}</strong>
                    {entry.primary ? " (main contact)" : ""}
                  </td>
                  <td>{entry.relationship ? entry.relationship[0].toUpperCase() + entry.relationship.slice(1) : "—"}</td>
                  <td>{entry.phone || "—"}</td>
                  <td>{entry.email || "—"}</td>
                  <td>{entry.learner ? `${entry.learner} (${entry.admission})` : "—"}</td>
                </tr>
              ))}
            </Table>
          </div>
        </div>
      ))}
    </Page>
  )
}