import { useState } from "react"

import { Empty, Note, Page, errorText, nameOf, relId } from "./AdminPeople"
import type { Msg } from "./AdminPeople"
import { Table, useFind } from "./LiveShell"
import { attendanceSummary, downloadLiveReport, fetchAttendance, resultsForTerm } from "./resultsData"
import type { MarkDoc, TermInfo } from "./resultsData"
import { useSchoolStore } from "./schoolStore"

type Assessment = { id: number; status?: string; term?: unknown; class?: unknown }
type Student = { id: number; name?: string; admissionNumber?: string; status?: string }
type Option = { id: number; name?: string; startDate?: string; endDate?: string }

export function ReportFormsLive() {
  const { schoolName } = useSchoolStore()
  const terms = useFind<Option>("terms", "limit=100&depth=0&sort=-startDate")
  const classes = useFind<Option>("classes", "limit=300&depth=0&sort=name")
  const assessments = useFind<Assessment>("assessments", "limit=1000&depth=0")
  const [termPick, setTermPick] = useState("")
  const [classPick, setClassPick] = useState("")
  const [msg, setMsg] = useState<Msg>({})
  const [busy, setBusy] = useState<number | null>(null)

  const termId = termPick || String(terms.rows[0]?.id ?? "")
  const classId = classPick || String(classes.rows[0]?.id ?? "")
  const term = terms.rows.find((item) => String(item.id) === termId)
  const klass = classes.rows.find((item) => String(item.id) === classId)

  const publishedIds = assessments.rows
    .filter((a) => a.status === "published" && String(relId(a.term)) === termId && String(relId(a.class)) === classId)
    .map((a) => a.id)
  const students = useFind<Student>("students", classId ? `limit=500&depth=0&sort=name&where[currentClass][equals]=${classId}` : null)
  const marks = useFind<MarkDoc>("marks", publishedIds.length ? `limit=5000&depth=2&where[assessment][in]=${publishedIds.join(",")}` : null)
  const roster = students.rows.filter((student) => student.status === "active")

  async function download(student: Student) {
    if (!term) return
    setBusy(student.id)
    try {
      const own = marks.rows.filter((mark) => relId(mark.student) === student.id)
      const info: TermInfo = { id: term.id, name: term.name ?? "Term", startDate: term.startDate, endDate: term.endDate }
      await downloadLiveReport({
        schoolName,
        learner: { name: student.name ?? "Learner", admission: student.admissionNumber ?? "", className: klass?.name ?? "" },
        termName: info.name,
        rows: resultsForTerm(own, term.id),
        attendance: attendanceSummary(await fetchAttendance(student.id, info)),
      })
      setMsg({ ok: `Report for ${student.name} downloaded.` })
    } catch (e) {
      setMsg({ err: errorText(e) })
    }
    setBusy(null)
  }

  return (
    <Page title="Report forms" subtitle="Download report forms for a class. Only published results are included.">
      <div className="admin-actions">
        <select className="table-select" value={termId} onChange={(e) => setTermPick(e.target.value)}>
          {terms.rows.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
        <select className="table-select" value={classId} onChange={(e) => setClassPick(e.target.value)}>
          {classes.rows.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
        <Note ok={msg.ok} error={msg.err} />
      </div>
      {!assessments.loading && publishedIds.length === 0 && (
        <p className="save-message">No results have been published for {nameOf(klass)} in this term yet.</p>
      )}
      <div className="content-card">
        <Empty loading={students.loading} error={students.error || marks.error} count={roster.length} text="No active learners in this class." />
        {roster.length > 0 && (
          <Table heads={["Admission no.", "Learner", "Learning areas published", "Report form"]}>
            {roster.map((student) => {
              const subjects = resultsForTerm(
                marks.rows.filter((mark) => relId(mark.student) === student.id),
                term?.id ?? 0,
              ).length
              return (
                <tr key={student.id}>
                  <td>{student.admissionNumber}</td>
                  <td>
                    <strong>{student.name}</strong>
                  </td>
                  <td>{subjects}</td>
                  <td>
                    <button className="primary-button" disabled={busy === student.id || subjects === 0} onClick={() => void download(student)}>
                      {busy === student.id ? "Preparing…" : "Download PDF"}
                    </button>
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