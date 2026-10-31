import { useState } from "react"

import type { FormEvent } from "react"

import { Plus } from "lucide-react"

import { apiCreate, apiGenerateInvoices, apiUpdate } from "./api"

import { Empty, Note, Page, errorText, nameOf, relId } from "./AdminPeople"

import type { Msg } from "./AdminPeople"

import { Field, Table, todayLocal, useFind } from "./LiveShell"

import { downloadReceipt, methodLabel, money } from "./receiptPdf"

import { downloadInvoicePdf } from "./invoicePdf"

import { useSchoolStore } from "./schoolStore"

type Line = { description: string; amount: number }

type Student = {
  id: number
  name?: string
  admissionNumber?: string
  status?: string
  currentClass?: unknown
}

type Invoice = {
  id: number
  number?: string
  student?: unknown
  term?: unknown
  lines?: Line[]
  total?: number
  carryForward?: number
  status?: string
  voidReason?: string | null
  createdAt?: string
}

type Payment = {
  id: number
  receiptNumber?: string
  student?: unknown
  amount: number
  method?: string
  reference?: string | null
  paidAt: string
  note?: string | null
  status?: string
  reversalReason?: string | null
}

type Adjustment = {
  id: number
  student?: unknown
  amount: number
  reason: string
  date: string
}

type Structure = {
  id: number
  name: string
  term?: unknown
  class?: unknown
  items?: { name: string; amount: number }[]
  isActive?: boolean
}

type Option = { id: number; name?: string; isCurrent?: boolean }

const heading = { margin: "22px 0 10px", fontSize: 15 } as const

/* ------------------------------ the ledger maths ------------------------------ */

export type Ledger = {
  invoices: Invoice[]
  payments: Payment[]
  adjustments: Adjustment[]
}

/** Billed + adjustments − valid payments. Void invoices and reversed payments do not count. */

export function balanceFor(studentId: number, ledger: Ledger) {
  const mine = <T extends { student?: unknown }>(rows: T[]) =>
    rows.filter((row) => relId(row.student) === studentId)

  const billed = mine(ledger.invoices)
    .filter((i) => i.status !== "void")
    .reduce((sum, i) => sum + (i.total ?? 0) - (i.carryForward ?? 0), 0)

  const adjusted = mine(ledger.adjustments).reduce((sum, a) => sum + a.amount, 0)

  const paid = mine(ledger.payments)
    .filter((p) => p.status !== "reversed")
    .reduce((sum, p) => sum + p.amount, 0)

  return {
    billed,
    adjusted,
    paid,
    balance: Math.round((billed + adjusted - paid) * 100) / 100,
  }
}

export type StatementRow = {
  date: string
  label: string
  detail: string
  charge: number
  credit: number
  balance: number
  payment?: Payment
  invoice?: Invoice
}

/** Every charge and payment in date order, with a running balance. */

export function buildStatement(studentId: number, ledger: Ledger): StatementRow[] {
  const rows: Omit<StatementRow, "balance">[] = []

  for (const i of ledger.invoices.filter(
    (x) => relId(x.student) === studentId && x.status !== "void",
  ))
    rows.push({
      date: (i.createdAt ?? "").slice(0, 10),
      label: `Invoice ${i.number ?? ""}`,
      detail: (i.lines ?? []).map((l) => l.description).join(", "),
      charge: (i.total ?? 0) - (i.carryForward ?? 0),
      credit: 0,
      invoice: i,
    })

  for (const a of ledger.adjustments.filter((x) => relId(x.student) === studentId))
    rows.push({
      date: a.date.slice(0, 10),
      label: "Adjustment",
      detail: a.reason,
      charge: a.amount > 0 ? a.amount : 0,
      credit: a.amount < 0 ? -a.amount : 0,
    })

  for (const p of ledger.payments.filter(
    (x) => relId(x.student) === studentId && x.status !== "reversed",
  ))
    rows.push({
      date: p.paidAt.slice(0, 10),
      label: `Payment ${p.receiptNumber ?? ""}`,
      detail: [methodLabel(p.method), p.reference].filter(Boolean).join(" · "),
      charge: 0,
      credit: p.amount,
      payment: p,
    })

  rows.sort((a, b) => a.date.localeCompare(b.date))

  let running = 0

  return rows.map((row) => {
    running = Math.round((running + row.charge - row.credit) * 100) / 100

    return { ...row, balance: running }
  })
}

function downloadCsv(filename: string, rows: (string | number)[][]) {
  const text = rows
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
    .join("\n")

  const link = document.createElement("a")

  link.href = URL.createObjectURL(new Blob([text], { type: "text/csv" }))

  link.download = filename

  link.click()

  URL.revokeObjectURL(link.href)
}

function useLedger(studentQuery = "") {
  const invoices = useFind<Invoice>("invoices", `limit=5000&depth=1&sort=createdAt${studentQuery}`)

  const payments = useFind<Payment>("payments", `limit=5000&depth=1&sort=-paidAt${studentQuery}`)

  const adjustments = useFind<Adjustment>("fee-adjustments", `limit=5000&depth=0${studentQuery}`)

  return {
    invoices,

    payments,

    adjustments,

    ledger: {
      invoices: invoices.rows,
      payments: payments.rows,
      adjustments: adjustments.rows,
    } as Ledger,

    loading: invoices.loading || payments.loading || adjustments.loading,

    error: invoices.error || payments.error || adjustments.error,

    reload: async () => {
      await Promise.all([invoices.reload(), payments.reload(), adjustments.reload()])
    },
  }
}

/* ------------------------------- Fee structures ------------------------------- */

export function FeeStructuresLive() {
  const structures = useFind<Structure>("fee-structures", "limit=300&depth=1&sort=-createdAt")

  const terms = useFind<Option>("terms", "limit=100&depth=0&sort=-startDate")

  const classes = useFind<Option>("classes", "limit=300&depth=0&sort=name")

  const [open, setOpen] = useState(false)

  const [msg, setMsg] = useState<Msg>({})

  const blank = {
    id: 0,
    name: "",
    term: "",
    class: "",
    template: "kindergarten",
    items: [
      { name: "Tuition", amount: "" },
      { name: "Learning materials", amount: "" },
      { name: "Meals", amount: "" },
      { name: "Activities", amount: "" },
    ],
  }

  const [form, setForm] = useState(blank)

  const feeTemplates = {
    kindergarten: ["Tuition", "Learning materials", "Meals", "Activities"],

    essentials: ["Tuition", "Learning materials"],

    custom: [] as string[],
  }

  const total = (items?: { amount: number }[]) =>
    (items ?? []).reduce((sum, item) => sum + item.amount, 0)

  const setItem = (index: number, patch: Partial<{ name: string; amount: string }>) =>
    setForm({
      ...form,
      items: form.items.map((item, i) => (i === index ? { ...item, ...patch } : item)),
    })

  function edit(s: Structure) {
    setForm({
      id: s.id,
      name: s.name,
      term: String(relId(s.term) ?? ""),
      class: String(relId(s.class) ?? ""),
      template: "custom",
      items: (s.items ?? []).map((i) => ({
        name: i.name,
        amount: String(i.amount),
      })),
    })

    setOpen(true)
  }

  async function save(event: FormEvent) {
    event.preventDefault()

    const data = {
      name: form.name,

      term: Number(form.term),

      class: Number(form.class),

      items: form.items.map((item) => ({
        name: item.name,
        amount: Number(item.amount),
      })),
    }

    try {
      if (form.id) await apiUpdate("fee-structures", form.id, data)
      else await apiCreate("fee-structures", { ...data, isActive: true })

      setMsg({ ok: "Fee structure saved." })

      setForm(blank)

      setOpen(false)

      await structures.reload()
    } catch (e) {
      setMsg({ err: errorText(e) })
    }
  }

  async function generate(s: Structure) {
    if (
      !window.confirm(
        `Create invoices for every active learner in ${nameOf(s.class)} from “${s.name}”? Learners who already have one are skipped.`,
      )
    )
      return

    try {
      const result = await apiGenerateInvoices(s.id)

      setMsg({
        ok: `${result.created} invoice${result.created === 1 ? "" : "s"} created${
          result.skipped ? `, ${result.skipped} skipped (already invoiced)` : ""
        }.`,
      })
    } catch (e) {
      setMsg({ err: errorText(e) })
    }
  }

  async function toggle(s: Structure) {
    try {
      await apiUpdate("fee-structures", s.id, { isActive: !s.isActive })

      await structures.reload()
    } catch (e) {
      setMsg({ err: errorText(e) })
    }
  }

  return (
    <Page
      title="Fee structures"
      subtitle="What each class pays in a term. Create invoices from a structure for the whole class at once."
    >
      <div className="admin-actions">
        <button
          className="primary-button"
          onClick={() => {
            setOpen(!open)
            setForm(blank)
          }}
        >
          <Plus size={15} /> {open ? "Close" : "New fee structure"}
        </button>
        <Note ok={msg.ok} error={msg.err} />
      </div>
      {open && (
        <form className="content-card record-form" onSubmit={save}>
          <Field label="Name">
            <input
              required
              value={form.name}
              placeholder="Grade 4 Term 1 fees"
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </Field>
          <Field label="Professional fee template">
            <select
              value={form.template}
              onChange={(e) =>
                setForm({
                  ...form,

                  template: e.target.value,

                  items: (feeTemplates[e.target.value as keyof typeof feeTemplates] ?? []).map(
                    (name) => ({ name, amount: "" }),
                  ),
                })
              }
            >
              <option value="kindergarten">Kindergarten term fees</option>
              <option value="essentials">Tuition and materials</option>
              <option value="custom">Custom fee items</option>
            </select>
          </Field>
          <Field label="Term">
            <select
              required
              value={form.term}
              onChange={(e) => setForm({ ...form, term: e.target.value })}
            >
              <option value="">Choose a term</option>
              {terms.rows.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Class">
            <select
              required
              value={form.class}
              onChange={(e) => setForm({ ...form, class: e.target.value })}
            >
              <option value="">Choose a class</option>
              {classes.rows.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </Field>
          <h3 style={{ ...heading, gridColumn: "1 / -1" }}>Fee items</h3>
          {form.items.map((item, index) => (
            <div
              key={index}
              style={{
                gridColumn: "1 / -1",
                display: "flex",
                gap: 8,
                flexWrap: "wrap",
              }}
            >
              <input
                required
                style={{ flex: 1, minWidth: 160 }}
                placeholder="Item (for example Tuition)"
                value={item.name}
                onChange={(e) => setItem(index, { name: e.target.value })}
              />
              <input
                required
                type="number"
                min={0}
                step="0.01"
                style={{ width: 140 }}
                placeholder="Amount (KES)"
                value={item.amount}
                onChange={(e) => setItem(index, { amount: e.target.value })}
              />
              {form.items.length > 1 && (
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() =>
                    setForm({
                      ...form,
                      items: form.items.filter((_, i) => i !== index),
                    })
                  }
                >
                  Remove
                </button>
              )}
            </div>
          ))}
          <div style={{ gridColumn: "1 / -1" }}>
            <button
              type="button"
              className="secondary-button"
              onClick={() =>
                setForm({
                  ...form,
                  items: [...form.items, { name: "", amount: "" }],
                })
              }
            >
              <Plus size={14} /> Add item
            </button>{" "}
            <strong>
              Total: {money(form.items.reduce((sum, item) => sum + (Number(item.amount) || 0), 0))}
            </strong>
          </div>
          <button className="primary-button" type="submit">
            Save fee structure
          </button>
        </form>
      )}
      <div className="content-card">
        <Empty
          loading={structures.loading}
          error={structures.error}
          count={structures.rows.length}
          text="No fee structures yet. Create one for a class and term."
        />
        {structures.rows.length > 0 && (
          <Table heads={["Name", "Term", "Class", "Items", "Total", "Status", ""]}>
            {structures.rows.map((s) => (
              <tr key={s.id}>
                <td>
                  <strong>{s.name}</strong>
                </td>
                <td>{nameOf(s.term)}</td>
                <td>{nameOf(s.class)}</td>
                <td>{(s.items ?? []).map((i) => `${i.name} ${money(i.amount)}`).join(", ")}</td>
                <td>{money(total(s.items))}</td>
                <td>{s.isActive ? "Active" : "Switched off"}</td>
                <td>
                  {s.isActive && (
                    <button className="primary-button" onClick={() => void generate(s)}>
                      Create invoices
                    </button>
                  )}{" "}
                  <button className="secondary-button" onClick={() => edit(s)}>
                    Edit
                  </button>{" "}
                  <button className="secondary-button" onClick={() => void toggle(s)}>
                    {s.isActive ? "Switch off" : "Switch on"}
                  </button>
                </td>
              </tr>
            ))}
          </Table>
        )}
      </div>
    </Page>
  )
}

/* ---------------------------------- Invoices ---------------------------------- */

export function InvoicesLive() {
  const { schoolName } = useSchoolStore()

  const invoices = useFind<Invoice>("invoices", "limit=2000&depth=1&sort=-createdAt")

  const students = useFind<Student>("students", "limit=2000&depth=1&sort=name")

  const terms = useFind<Option>("terms", "limit=100&depth=0&sort=-startDate")

  const [open, setOpen] = useState(false)

  const [msg, setMsg] = useState<Msg>({})

  const [search, setSearch] = useState("")

  const [termFilter, setTermFilter] = useState("")

  const blank = {
    student: "",
    term: "",
    lines: [{ description: "", amount: "" }],
  }

  const [form, setForm] = useState(blank)

  const active = students.rows.filter((s) => s.status === "active")

  const studentOf = (id: number) => students.rows.find((student) => student.id === id)

  const shown = invoices.rows.filter(
    (i) =>
      (!termFilter || String(relId(i.term)) === termFilter) &&
      `${i.number} ${nameOf(i.student)}`.toLowerCase().includes(search.trim().toLowerCase()),
  )

  const setLine = (index: number, patch: Partial<{ description: string; amount: string }>) =>
    setForm({
      ...form,
      lines: form.lines.map((line, i) => (i === index ? { ...line, ...patch } : line)),
    })

  async function downloadInvoice(i: Invoice) {
    const student = studentOf(relId(i.student) ?? 0)

    try {
      await downloadInvoicePdf({
        schoolName,

        invoice: i,

        learner: {
          name: student?.name ?? (nameOf(i.student) || "Learner"),

          admission: student?.admissionNumber ?? "",

          className: nameOf(student?.currentClass),
        },

        termName: nameOf(i.term),
      })
    } catch (e) {
      setMsg({ err: errorText(e) })
    }
  }

  async function create(event: FormEvent) {
    event.preventDefault()

    try {
      await apiCreate("invoices", {
        student: Number(form.student),

        term: Number(form.term),

        lines: form.lines.map((line) => ({
          description: line.description,
          amount: Number(line.amount),
        })),
      })

      setMsg({ ok: "Invoice issued." })

      setForm(blank)

      setOpen(false)

      await invoices.reload()
    } catch (e) {
      setMsg({ err: errorText(e) })
    }
  }

  async function voidInvoice(i: Invoice) {
    const reason = window.prompt(`Why is ${i.number} being voided?`)

    if (!reason?.trim()) return

    try {
      await apiUpdate("invoices", i.id, {
        status: "void",
        voidReason: reason.trim(),
      })

      setMsg({ ok: `${i.number} voided.` })

      await invoices.reload()
    } catch (e) {
      setMsg({ err: errorText(e) })
    }
  }

  const issuedTotal = shown
    .filter((i) => i.status !== "void")
    .reduce((sum, i) => sum + (i.total ?? 0) - (i.carryForward ?? 0), 0)

  return (
    <Page
      title="Invoices"
      subtitle="Fees billed to learners. Invoices cannot be edited. Void one and issue a new invoice, or add an adjustment."
    >
      <div className="admin-actions">
        <button className="primary-button" onClick={() => setOpen(!open)}>
          <Plus size={15} /> {open ? "Close" : "Invoice a learner"}
        </button>
        <select
          className="table-select"
          value={termFilter}
          onChange={(e) => setTermFilter(e.target.value)}
        >
          <option value="">All terms</option>
          {terms.rows.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
        <input
          value={search}
          placeholder="Search invoice number or learner"
          onChange={(e) => setSearch(e.target.value)}
        />
        <Note ok={msg.ok} error={msg.err} />
      </div>
      {open && (
        <form className="content-card record-form" onSubmit={create}>
          <Field label="Learner">
            <select
              required
              value={form.student}
              onChange={(e) => setForm({ ...form, student: e.target.value })}
            >
              <option value="">Choose a learner</option>
              {active.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.admissionNumber})
                </option>
              ))}
            </select>
          </Field>
          <Field label="Term">
            <select
              required
              value={form.term}
              onChange={(e) => setForm({ ...form, term: e.target.value })}
            >
              <option value="">Choose a term</option>
              {terms.rows.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </Field>
          <h3 style={{ ...heading, gridColumn: "1 / -1" }}>
            Fee lines (use a minus for a discount)
          </h3>
          {form.lines.map((line, index) => (
            <div
              key={index}
              style={{
                gridColumn: "1 / -1",
                display: "flex",
                gap: 8,
                flexWrap: "wrap",
              }}
            >
              <input
                required
                style={{ flex: 1, minWidth: 160 }}
                placeholder="Description"
                value={line.description}
                onChange={(e) => setLine(index, { description: e.target.value })}
              />
              <input
                required
                type="number"
                step="0.01"
                style={{ width: 140 }}
                placeholder="Amount (KES)"
                value={line.amount}
                onChange={(e) => setLine(index, { amount: e.target.value })}
              />
              {form.lines.length > 1 && (
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() =>
                    setForm({
                      ...form,
                      lines: form.lines.filter((_, i) => i !== index),
                    })
                  }
                >
                  Remove
                </button>
              )}
            </div>
          ))}
          <div style={{ gridColumn: "1 / -1" }}>
            <button
              type="button"
              className="secondary-button"
              onClick={() =>
                setForm({
                  ...form,
                  lines: [...form.lines, { description: "", amount: "" }],
                })
              }
            >
              <Plus size={14} /> Add line
            </button>{" "}
            <strong>
              Total: {money(form.lines.reduce((sum, line) => sum + (Number(line.amount) || 0), 0))}
            </strong>
          </div>
          <button className="primary-button" type="submit">
            Issue invoice
          </button>
        </form>
      )}
      <div className="content-card">
        <Empty
          loading={invoices.loading}
          error={invoices.error}
          count={shown.length}
          text="No invoices yet. Create invoices from a fee structure, or invoice one learner."
        />
        {shown.length > 0 && (
          <>
            <Table heads={["Invoice", "Learner", "Term", "Details", "Total", "Status", ""]}>
              {shown.map((i) => (
                <tr key={i.id} style={i.status === "void" ? { opacity: 0.55 } : undefined}>
                  <td>
                    <strong>{i.number}</strong>
                  </td>
                  <td>{nameOf(i.student)}</td>
                  <td>{nameOf(i.term)}</td>
                  <td>
                    {(i.lines ?? []).map((l) => `${l.description} ${money(l.amount)}`).join(", ")}
                  </td>
                  <td>{money(i.total ?? 0)}</td>
                  <td>{i.status === "void" ? `Void (${i.voidReason})` : "Issued"}</td>
                  <td>
                    <button className="secondary-button" onClick={() => void downloadInvoice(i)}>
                      PDF
                    </button>{" "}
                    {i.status !== "void" && (
                      <button className="secondary-button" onClick={() => void voidInvoice(i)}>
                        Void
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </Table>
            <p style={{ padding: 12 }}>
              <strong>Billed in this list: {money(issuedTotal)}</strong>
            </p>
          </>
        )}
      </div>
    </Page>
  )
}

/* ---------------------------------- Payments ---------------------------------- */

export function PaymentsLive() {
  const { schoolName } = useSchoolStore()

  const { ledger, payments, loading, reload } = useLedger()

  const students = useFind<Student>("students", "limit=2000&depth=1&sort=name")

  const [open, setOpen] = useState(false)

  const [msg, setMsg] = useState<Msg>({})

  const [search, setSearch] = useState("")

  const [last, setLast] = useState<Payment | null>(null)

  const blank = {
    student: "",
    amount: "",
    method: "cash",
    reference: "",
    paidAt: todayLocal(),
    note: "",
  }

  const [form, setForm] = useState(blank)

  const studentOf = (id: number) => students.rows.find((s) => s.id === id)

  const active = students.rows.filter((s) => s.status === "active")

  const shown = payments.rows.filter((p) =>
    `${p.receiptNumber} ${nameOf(p.student)} ${p.reference ?? ""}`
      .toLowerCase()
      .includes(search.trim().toLowerCase()),
  )

  async function receipt(p: Payment) {
    const id = relId(p.student) ?? 0

    const s = studentOf(id)

    try {
      await downloadReceipt({
        schoolName,

        payment: p,

        learner: {
          name: s?.name ?? nameOf(p.student),
          admission: s?.admissionNumber ?? "",
          className: nameOf(s?.currentClass),
        },

        balance: balanceFor(id, ledger).balance,
      })
    } catch (e) {
      setMsg({ err: errorText(e) })
    }
  }

  async function record(event: FormEvent) {
    event.preventDefault()

    try {
      const saved = await apiCreate<Payment>("payments", {
        student: Number(form.student),

        amount: Number(form.amount),

        method: form.method,

        reference: form.reference || null,

        paidAt: `${form.paidAt}T00:00:00.000Z`,

        note: form.note || null,
      })

      setLast(saved)

      setMsg({ ok: `Payment recorded. Receipt ${saved.receiptNumber}.` })

      setForm(blank)

      setOpen(false)

      await reload()
    } catch (e) {
      setMsg({ err: errorText(e) })
    }
  }

  async function reverse(p: Payment) {
    const reason = window.prompt(`Why is ${p.receiptNumber} (${money(p.amount)}) being reversed?`)

    if (!reason?.trim()) return

    try {
      await apiUpdate("payments", p.id, {
        status: "reversed",
        reversalReason: reason.trim(),
      })

      setMsg({ ok: `${p.receiptNumber} reversed.` })

      await reload()
    } catch (e) {
      setMsg({ err: errorText(e) })
    }
  }

  const owing = form.student ? balanceFor(Number(form.student), ledger).balance : null

  return (
    <Page
      title="Payments"
      subtitle="Record fees received and print receipts. A payment cannot be edited. If there is a mistake, reverse it and record the right one."
    >
      <div className="admin-actions">
        <button className="primary-button" onClick={() => setOpen(!open)}>
          <Plus size={15} /> {open ? "Close" : "Record payment"}
        </button>
        <input
          value={search}
          placeholder="Search receipt, learner or reference"
          onChange={(e) => setSearch(e.target.value)}
        />
        <Note ok={msg.ok} error={msg.err} />
        {last && (
          <button className="secondary-button" onClick={() => void receipt(last)}>
            Print receipt {last.receiptNumber}
          </button>
        )}
      </div>
      {open && (
        <form className="content-card record-form" onSubmit={record}>
          <Field label="Learner">
            <select
              required
              value={form.student}
              onChange={(e) => setForm({ ...form, student: e.target.value })}
            >
              <option value="">Choose a learner</option>
              {active.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.admissionNumber}){" "}
                  {loading ? "" : `· owes ${money(Math.max(balanceFor(s.id, ledger).balance, 0))}`}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Amount received (KES)">
            <input
              required
              type="number"
              min={0.01}
              step="0.01"
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
            />
          </Field>
          <Field label="How was it paid">
            <select
              value={form.method}
              onChange={(e) => setForm({ ...form, method: e.target.value })}
            >
              {["cash", "mpesa", "bank", "cheque", "other"].map((m) => (
                <option key={m} value={m}>
                  {methodLabel(m)}
                </option>
              ))}
            </select>
          </Field>
          {form.method !== "cash" && (
            <Field label={form.method === "mpesa" ? "M-Pesa code" : "Reference"}>
              <input
                required
                value={form.reference}
                onChange={(e) => setForm({ ...form, reference: e.target.value.trim() })}
              />
            </Field>
          )}
          <Field label="Date paid">
            <input
              required
              type="date"
              max={todayLocal()}
              value={form.paidAt}
              onChange={(e) => setForm({ ...form, paidAt: e.target.value })}
            />
          </Field>
          <Field label="Note (optional)">
            <input value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
          </Field>
          {owing !== null && <p className="save-message">Current balance: {money(owing)}</p>}
          <button className="primary-button" type="submit">
            Record payment
          </button>
        </form>
      )}
      <div className="content-card">
        <Empty
          loading={payments.loading}
          error={payments.error}
          count={shown.length}
          text="No payments recorded yet."
        />
        {shown.length > 0 && (
          <Table
            heads={["Receipt", "Date", "Learner", "Amount", "Method", "Reference", "Status", ""]}
          >
            {shown.map((p) => (
              <tr key={p.id} style={p.status === "reversed" ? { opacity: 0.55 } : undefined}>
                <td>
                  <strong>{p.receiptNumber}</strong>
                </td>
                <td>{p.paidAt.slice(0, 10)}</td>
                <td>{nameOf(p.student)}</td>
                <td>{money(p.amount)}</td>
                <td>{methodLabel(p.method)}</td>
                <td>{p.reference || "—"}</td>
                <td>{p.status === "reversed" ? `Reversed (${p.reversalReason})` : "Valid"}</td>
                <td>
                  <button className="secondary-button" onClick={() => void receipt(p)}>
                    Receipt
                  </button>{" "}
                  {p.status !== "reversed" && (
                    <button className="secondary-button" onClick={() => void reverse(p)}>
                      Reverse
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </Table>
        )}
      </div>
    </Page>
  )
}

/* ------------------------------- Reconciliation ------------------------------- */

export function ReconciliationLive() {
  const { ledger, loading, error } = useLedger()

  const students = useFind<Student>("students", "limit=2000&depth=1&sort=name")

  const [classFilter, setClassFilter] = useState("")

  const active = students.rows.filter((s) => s.status === "active")

  const rows = active.map((s) => ({
    s,
    ...balanceFor(s.id, ledger),
    className: nameOf(s.currentClass) || "No class",
  }))

  const totals = rows.reduce(
    (t, r) => ({
      billed: t.billed + r.billed,
      adjusted: t.adjusted + r.adjusted,
      paid: t.paid + r.paid,
    }),
    { billed: 0, adjusted: 0, paid: 0 },
  )

  const owed = rows.reduce((sum, r) => sum + Math.max(r.balance, 0), 0)

  const classes = [...new Set(rows.map((r) => r.className))].sort()

  const byClass = classes.map((name) => {
    const inClass = rows.filter((r) => r.className === name)

    return {
      name,
      learners: inClass.length,
      billed: inClass.reduce((s, r) => s + r.billed + r.adjusted, 0),
      paid: inClass.reduce((s, r) => s + r.paid, 0),
      owed: inClass.reduce((s, r) => s + Math.max(r.balance, 0), 0),
    }
  })

  const arrears = rows
    .filter((r) => r.balance > 0 && (!classFilter || r.className === classFilter))
    .sort((a, b) => b.balance - a.balance)

  const methods = new Map<string, number>()

  for (const p of ledger.payments.filter((x) => x.status !== "reversed"))
    methods.set(methodLabel(p.method), (methods.get(methodLabel(p.method)) ?? 0) + p.amount)

  const cards: [string, string, string][] = [
    ["BILLED", money(totals.billed), "Invoices issued"],

    ["ADJUSTMENTS", money(totals.adjusted), "Discounts and waivers are negative"],

    ["COLLECTED", money(totals.paid), "Valid payments"],

    ["OUTSTANDING", money(owed), "Owed by active learners"],
  ]

  return (
    <Page
      title="Reconciliation"
      subtitle="How much has been billed, collected and is still owed. Matching bank and M-Pesa statements arrives with the M-Pesa connection."
    >
      <Empty loading={loading || students.loading} error={error} count={1} text="" />
      <section className="admin-metrics">
        {cards.map(([label, value, detail]) => (
          <article key={label}>
            <span>{label}</span>
            <strong>{value}</strong>
            <small>{detail}</small>
          </article>
        ))}
      </section>
      <h3 style={heading}>By class</h3>
      <div className="content-card">
        {byClass.length === 0 ? (
          <p style={{ padding: 16 }}>Nothing to show yet.</p>
        ) : (
          <Table
            heads={["Class", "Learners", "Billed (after adjustments)", "Collected", "Outstanding"]}
          >
            {byClass.map((c) => (
              <tr key={c.name}>
                <td>
                  <strong>{c.name}</strong>
                </td>
                <td>{c.learners}</td>
                <td>{money(c.billed)}</td>
                <td>{money(c.paid)}</td>
                <td>{money(c.owed)}</td>
              </tr>
            ))}
          </Table>
        )}
      </div>
      <h3 style={heading}>Collected by payment method</h3>
      <div className="content-card">
        {methods.size === 0 ? (
          <p style={{ padding: 16 }}>No payments yet.</p>
        ) : (
          <Table heads={["Method", "Collected"]}>
            {[...methods.entries()].map(([name, amount]) => (
              <tr key={name}>
                <td>{name}</td>
                <td>{money(amount)}</td>
              </tr>
            ))}
          </Table>
        )}
      </div>
      <h3 style={heading}>Fee arrears</h3>
      <div className="admin-actions">
        <select
          className="table-select"
          value={classFilter}
          onChange={(e) => setClassFilter(e.target.value)}
        >
          <option value="">All classes</option>
          {classes.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
        <button
          className="secondary-button"
          disabled={arrears.length === 0}
          onClick={() =>
            downloadCsv("fee-arrears.csv", [
              ["Admission", "Learner", "Class", "Billed", "Adjustments", "Paid", "Balance"],
              ...arrears.map((r) => [
                r.s.admissionNumber ?? "",
                r.s.name ?? "",
                r.className,
                r.billed,
                r.adjusted,
                r.paid,
                r.balance,
              ]),
            ])
          }
        >
          Download CSV
        </button>
      </div>
      <div className="content-card">
        {arrears.length === 0 ? (
          <p style={{ padding: 16 }}>No learners owe fees.</p>
        ) : (
          <Table heads={["Admission no.", "Learner", "Class", "Billed", "Paid", "Balance"]}>
            {arrears.map((r) => (
              <tr key={r.s.id}>
                <td>{r.s.admissionNumber}</td>
                <td>
                  <strong>{r.s.name}</strong>
                </td>
                <td>{r.className}</td>
                <td>{money(r.billed + r.adjusted)}</td>
                <td>{money(r.paid)}</td>
                <td>
                  <strong>{money(r.balance)}</strong>
                </td>
              </tr>
            ))}
          </Table>
        )}
      </div>
    </Page>
  )
}

/* ------------------------------ family: fee statement ------------------------------ */

type Child = {
  id: number
  name?: string
  admissionNumber?: string
  currentClass?: unknown
}

export function FamilyFees({ child }: { child: Child }) {
  const { schoolName } = useSchoolStore()

  const { ledger, loading, error } = useLedger(`&where[student][equals]=${child.id}`)

  const [msg, setMsg] = useState<Msg>({})

  const totals = balanceFor(child.id, ledger)

  const statement = buildStatement(child.id, ledger)

  const reversed = ledger.payments.filter((p) => p.status === "reversed")

  async function receipt(p: Payment) {
    try {
      await downloadReceipt({
        schoolName,

        payment: p,

        learner: {
          name: child.name ?? "Learner",
          admission: child.admissionNumber ?? "",
          className: nameOf(child.currentClass),
        },

        balance: totals.balance,
      })
    } catch (e) {
      setMsg({ err: errorText(e) })
    }
  }

  const cards: [string, string, string][] = [
    ["BILLED", money(totals.billed + totals.adjusted), "Fees charged, after discounts"],

    ["PAID", money(totals.paid), "Payments received"],

    [
      totals.balance < 0 ? "CREDIT" : "BALANCE",
      money(Math.abs(totals.balance)),
      totals.balance > 0 ? "Still to pay" : totals.balance < 0 ? "Paid in advance" : "Fully paid",
    ],
  ]

  return (
    <Page title="Fees" subtitle={`Fee statement for ${child.name ?? "your learner"}.`}>
      <Note ok={msg.ok} error={msg.err} />
      <section className="admin-metrics">
        {cards.map(([label, value, detail]) => (
          <article key={label}>
            <span>{label}</span>
            <strong>{value}</strong>
            <small>{detail}</small>
          </article>
        ))}
      </section>
      <h3 style={heading}>Statement</h3>
      <div className="content-card">
        <Empty
          loading={loading}
          error={error}
          count={statement.length}
          text="No fees have been billed yet."
        />
        {statement.length > 0 && (
          <Table heads={["Date", "Entry", "Details", "Charged", "Paid or credited", "Balance", ""]}>
            {statement.map((row, index) => (
              <tr key={index}>
                <td>{row.date}</td>
                <td>
                  <strong>{row.label}</strong>
                </td>
                <td>{row.detail}</td>
                <td>{row.charge ? money(row.charge) : ""}</td>
                <td>{row.credit ? money(row.credit) : ""}</td>
                <td>{money(row.balance)}</td>
                <td>
                  {row.invoice && (
                    <button
                      className="secondary-button"
                      onClick={() =>
                        void downloadInvoicePdf({
                          schoolName,

                          invoice: row.invoice!,

                          learner: {
                            name: child.name ?? "Learner",

                            admission: child.admissionNumber ?? "",

                            className: nameOf(child.currentClass),
                          },

                          termName: nameOf(row.invoice!.term),
                        }).catch((e) => setMsg({ err: errorText(e) }))
                      }
                    >
                      Invoice
                    </button>
                  )}
                  {row.payment && (
                    <button className="secondary-button" onClick={() => void receipt(row.payment!)}>
                      Receipt
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </Table>
        )}
      </div>
      {reversed.length > 0 && (
        <p className="save-message" style={{ marginTop: 10 }}>
          {reversed.length} payment{reversed.length === 1 ? " was" : "s were"} reversed by the
          school and {reversed.length === 1 ? "is" : "are"} not counted above. Please contact the
          school office if you have a question.
        </p>
      )}
    </Page>
  )
}
