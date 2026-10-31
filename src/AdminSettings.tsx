import { useEffect, useState } from "react"

import type { FormEvent } from "react"

import { Plus } from "lucide-react"

import { apiGlobal, apiSaveGlobal, apiUploadMedia } from "./api"

import { Note, Page, errorText } from "./AdminPeople"

import type { Msg } from "./AdminPeople"

import { Field } from "./LiveShell"

import { applySchoolSettings } from "./settingsData"

import type { SchoolSettingsDoc } from "./settingsData"

type BandRow = { label: string; minPercent: string; remark: string }

const heading = {
  margin: "22px 0 10px",
  fontSize: 15,
  gridColumn: "1 / -1",
} as const

/** School profile, report-form details and grading levels. Saved to the school database. */

export function SettingsLive() {
  const [loaded, setLoaded] = useState(false)

  const [msg, setMsg] = useState<Msg>({})

  const [busy, setBusy] = useState(false)

  const [form, setForm] = useState({
    schoolName: "",

    motto: "",

    phone: "",

    email: "",

    address: "",

    principalName: "",

    reportFooter: "",

    primaryColor: "#3478c8",

    schoolBadgeUrl: "",

    schoolPhotoUrl: "",

    reportTemplate: "classic" as "classic" | "modern",

    invoiceTemplate: "classic" as "classic" | "modern",

    invoiceFooter: "",
  })

  const [bands, setBands] = useState<BandRow[]>([])

  const [uploadingBadge, setUploadingBadge] = useState(false)

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

          primaryColor: doc.primaryColor ?? "#3478c8",

          schoolBadgeUrl: doc.schoolBadgeUrl ?? "",

          schoolPhotoUrl: doc.schoolPhotoUrl ?? "",

          reportTemplate: doc.reportTemplate ?? "classic",

          invoiceTemplate: doc.invoiceTemplate ?? "classic",

          invoiceFooter: doc.invoiceFooter ?? "",
        })

        setBands(
          (doc.gradeBands ?? []).map((band) => ({
            label: band.label,
            minPercent: String(band.minPercent),
            remark: band.remark ?? "",
          })),
        )

        setLoaded(true)
      })

      .catch((e) => setMsg({ err: errorText(e) }))
  }, [])

  const setBand = (index: number, patch: Partial<BandRow>) =>
    setBands(bands.map((band, i) => (i === index ? { ...band, ...patch } : band)))

  async function save(event: FormEvent) {
    event.preventDefault()

    if (!bands.some((band) => Number(band.minPercent) === 0)) {
      setMsg({
        err: "Add a grading level that starts at 0%, so every result gets a level.",
      })

      return
    }

    setBusy(true)

    try {
      const data = {
        ...form,

        email: form.email || null,

        gradeBands: bands.map((band) => ({
          label: band.label,
          minPercent: Number(band.minPercent),
          remark: band.remark,
        })),
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
            <input
              required
              value={form.schoolName}
              onChange={(e) => setForm({ ...form, schoolName: e.target.value })}
            />
          </Field>
          <Field label="Motto">
            <input
              value={form.motto}
              onChange={(e) => setForm({ ...form, motto: e.target.value })}
            />
          </Field>
          <Field label="School theme color">
            <div className="brand-color-control">
              <input
                aria-label="School theme color"
                type="color"
                value={form.primaryColor}
                onChange={(e) => setForm({ ...form, primaryColor: e.target.value })}
              />
              <code>{form.primaryColor}</code>
            </div>
          </Field>
          <Field label="School badge">
            <div className="badge-upload-control">
              {form.schoolBadgeUrl && <img src={form.schoolBadgeUrl} alt="School badge preview" />}
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp,image/svg+xml"
                disabled={uploadingBadge}
                onChange={async (event) => {
                  const file = event.target.files?.[0]

                  if (!file) return

                  setUploadingBadge(true)

                  try {
                    const media = await apiUploadMedia(file, `${form.schoolName} badge`)

                    setForm((current) => ({
                      ...current,
                      schoolBadgeUrl: media.url ?? "",
                    }))

                    setMsg({
                      ok: "School badge uploaded. Save settings to apply it.",
                    })
                  } catch (error) {
                    setMsg({ err: errorText(error) })
                  } finally {
                    setUploadingBadge(false)

                    event.target.value = ""
                  }
                }}
              />
              {uploadingBadge && <small>Uploading badge…</small>}
              {form.schoolBadgeUrl && (
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => setForm({ ...form, schoolBadgeUrl: "" })}
                >
                  Remove badge
                </button>
              )}
            </div>
          </Field>
          <Field label="School photo">
            <div className="badge-upload-control">
              {form.schoolPhotoUrl && (
                <img
                  className="school-photo-preview"
                  src={form.schoolPhotoUrl}
                  alt="School photo preview"
                />
              )}
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                disabled={uploadingBadge}
                onChange={async (event) => {
                  const file = event.target.files?.[0]

                  if (!file) return

                  setUploadingBadge(true)

                  try {
                    const media = await apiUploadMedia(file, `${form.schoolName} school photo`)

                    setForm((current) => ({
                      ...current,
                      schoolPhotoUrl: media.url ?? "",
                    }))

                    setMsg({
                      ok: "School photo uploaded. Save settings to apply it.",
                    })
                  } catch (error) {
                    setMsg({ err: errorText(error) })
                  } finally {
                    setUploadingBadge(false)

                    event.target.value = ""
                  }
                }}
              />
              {uploadingBadge && <small>Uploading photo…</small>}
              {form.schoolPhotoUrl && (
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => setForm({ ...form, schoolPhotoUrl: "" })}
                >
                  Remove photo
                </button>
              )}
            </div>
          </Field>
          <Field label="Phone">
            <input
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
          </Field>
          <Field label="Email">
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </Field>
          <Field label="Address">
            <textarea
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
            />
          </Field>
          <h3 style={heading}>Report forms</h3>
          <Field label="Report layout">
            <select
              value={form.reportTemplate}
              onChange={(e) =>
                setForm({
                  ...form,
                  reportTemplate: e.target.value as "classic" | "modern",
                })
              }
            >
              <option value="classic">Classic school report</option>
              <option value="modern">Modern blue report</option>
            </select>
          </Field>
          <Field label="Head teacher or principal">
            <input
              value={form.principalName}
              onChange={(e) => setForm({ ...form, principalName: e.target.value })}
            />
          </Field>
          <Field label="Footer line">
            <textarea
              value={form.reportFooter}
              onChange={(e) => setForm({ ...form, reportFooter: e.target.value })}
            />
          </Field>
          <h3 style={heading}>Invoices and receipts</h3>
          <Field label="Invoice layout">
            <select
              value={form.invoiceTemplate}
              onChange={(e) =>
                setForm({
                  ...form,
                  invoiceTemplate: e.target.value as "classic" | "modern",
                })
              }
            >
              <option value="classic">Classic school invoice</option>
              <option value="modern">Modern blue invoice</option>
            </select>
          </Field>
          <Field label="Payment instructions on invoices">
            <textarea
              value={form.invoiceFooter}
              onChange={(e) => setForm({ ...form, invoiceFooter: e.target.value })}
            />
          </Field>
          <h3 style={heading}>Grading levels</h3>
          <p className="save-message" style={{ gridColumn: "1 / -1" }}>
            A result at or above the minimum percentage earns that level. One level must start at
            0%.
          </p>
          {bands.map((band, index) => (
            <div
              key={index}
              style={{
                gridColumn: "1 / -1",
                display: "flex",
                gap: 8,
                flexWrap: "wrap",
                alignItems: "center",
              }}
            >
              <input
                required
                style={{ width: 80 }}
                placeholder="Level"
                value={band.label}
                onChange={(e) => setBand(index, { label: e.target.value })}
              />
              <input
                required
                type="number"
                min={0}
                max={100}
                style={{ width: 100 }}
                placeholder="From %"
                value={band.minPercent}
                onChange={(e) => setBand(index, { minPercent: e.target.value })}
              />
              <input
                style={{ flex: 1, minWidth: 180 }}
                placeholder="Comment shown on reports"
                value={band.remark}
                onChange={(e) => setBand(index, { remark: e.target.value })}
              />
              <button
                type="button"
                className="secondary-button"
                onClick={() => setBands(bands.filter((_, i) => i !== index))}
              >
                Remove
              </button>
            </div>
          ))}
          <div style={{ gridColumn: "1 / -1" }}>
            <button
              type="button"
              className="secondary-button"
              onClick={() => setBands([...bands, { label: "", minPercent: "", remark: "" }])}
            >
              <Plus size={14} /> Add level
            </button>
          </div>
          <button className="primary-button" type="submit" disabled={busy || uploadingBadge}>
            {busy ? "Saving…" : "Save settings"}
          </button>
        </form>
      )}
    </Page>
  )
}
