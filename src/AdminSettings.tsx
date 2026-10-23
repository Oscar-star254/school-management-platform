import { useEffect, useState } from "react"
import type { FormEvent } from "react"
import { Plus } from "lucide-react"

import { apiGlobal, apiSaveGlobal } from "./api"
import { Note, Page, errorText } from "./AdminPeople"
import type { Msg } from "./AdminPeople"
import { Field } from "./LiveShell"
import { applySchoolSettings } from "./settingsData"
import type { SchoolSettingsDoc } from "./settingsData"

type BandRow = { label: string; minPercent: string; remark: string }
const heading = { margin: "22px 0 10px", fontSize: 15, gridColumn: "1 / -1" } as const

/** School profile, report-form details and grading levels. Saved to the school database. */
export function SettingsLive() {
  const [loaded, setLoaded] = useState(false)
  const [msg, setMsg] = useState<Msg>({})
  const [busy, setBusy] = useState(false)
  const [form, setForm] = useState({ schoolName: "", motto: "", phone: "", email: "", address: "", principalName: "", reportFooter: "" })
  const [bands, setBands] = useState<BandRow[]>([])

  useEffect(() => {
    apiGlobal<SchoolSettingsDoc>("school-settings")
      .then((doc) => {
        setForm({
          schoolName: doc.schoolName ?? "",
          motto: doc.motto ?? "",
          phone: doc.phone ?? "",
          email: doc.email ?? "",
          address: doc.address ?? "",
          principalName: doc.principalName ?? "",
          reportFooter: doc.reportFooter ?? "",
        })
        setBands((doc.gradeBands ?? []).map((band) => ({ label: band.label, minPercent: String(band.minPercent), remark: band.remark ?? "" })))
        setLoaded(true)
      })
      .catch((e) => setMsg({ err: errorText(e) }))
  }, [])

  const setBand = (index: number, patch: Partial<BandRow>) => setBands(bands.map((band, i) => (i === index ? { ...band, ...patch } : band)))

  async function save(event: FormEvent) {
    event.preventDefault()
    if (!bands.some((band) => Number(band.minPercent) === 0)) {
      setMsg({ err: "Add a grading level that starts at 0%, so every result gets a level." })
      return
    }
    setBusy(true)
    try {
      const data = {
        ...form,
        email: form.email || null,
        gradeBands: bands.map((band) => ({ label: band.label, minPercent: Number(band.minPercent), remark: band.remark })),
      }
      await apiSaveGlobal("school-settings", data)
      applySchoolSettings({ ...data, gradeBands: data.gradeBands })
      setMsg({ ok: "Settings saved." })
    } catch (e) {
      setMsg({ err: errorText(e) })
    }
    setBusy(false)
  }

  return (
    <Page title="Settings" subtitle="The school's profile, report-form details and grading levels.">
      <div className="admin-actions">
        <Note ok={msg.ok} error={msg.err} />
      </div>
      {loaded && (
        <form className="content-card record-form" onSubmit={save}>
          <h3 style={heading}>School profile</h3>
          <Field label="School name">
            <input required value={form.schoolName} onChange={(e) => setForm({ ...form, schoolName: e.target.value })} />
          </Field>
          <Field label="Motto">
            <input value={form.motto} onChange={(e) => setForm({ ...form, motto: e.target.value })} />
          </Field>
          <Field label="Phone">
            <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </Field>
          <Field label="Email">
            <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </Field>
          <Field label="Address">
            <textarea value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
          </Field>
          <h3 style={heading}>Report forms</h3>
          <Field label="Head teacher or principal">
            <input value={form.principalName} onChange={(e) => setForm({ ...form, principalName: e.target.value })} />
          </Field>
          <Field label="Footer line">
            <textarea value={form.reportFooter} onChange={(e) => setForm({ ...form, reportFooter: e.target.value })} />
          </Field>
          <h3 style={heading}>Grading levels</h3>
          <p className="save-message" style={{ gridColumn: "1 / -1" }}>
            A result at or above the minimum percentage earns that level. One level must start at 0%.
          </p>
          {bands.map((band, index) => (
            <div key={index} style={{ gridColumn: "1 / -1", display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
              <input required style={{ width: 80 }} placeholder="Level" value={band.label} onChange={(e) => setBand(index, { label: e.target.value })} />
              <input required type="number" min={0} max={100} style={{ width: 100 }} placeholder="From %" value={band.minPercent} onChange={(e) => setBand(index, { minPercent: e.target.value })} />
              <input style={{ flex: 1, minWidth: 180 }} placeholder="Comment shown on reports" value={band.remark} onChange={(e) => setBand(index, { remark: e.target.value })} />
              <button type="button" className="secondary-button" onClick={() => setBands(bands.filter((_, i) => i !== index))}>
                Remove
              </button>
            </div>
          ))}
          <div style={{ gridColumn: "1 / -1" }}>
            <button type="button" className="secondary-button" onClick={() => setBands([...bands, { label: "", minPercent: "", remark: "" }])}>
              <Plus size={14} /> Add level
            </button>
          </div>
          <button className="primary-button" type="submit" disabled={busy}>
            {busy ? "Saving…" : "Save settings"}
          </button>
        </form>
      )}
    </Page>
  )
}