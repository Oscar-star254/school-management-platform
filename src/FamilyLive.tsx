import { useState } from "react"

import { ComingSoon, Empty, Note, Page, errorText, nameOf } from "./AdminPeople"
import type { Msg } from "./AdminPeople"
import { Table, useFind } from "./LiveShell"
import {
  attendanceQuery,
  attendanceSummary,
  downloadLiveReport,
  fetchAttendance,
  levelFor,
  overallPercent,
  publishedMarks,
  resultsForTerm,
  termsOf,
} from "./resultsData"
import type { AttendanceDoc, MarkDoc, TermInfo } from "./resultsData"
import { useSchoolStore } from "./schoolStore"

type Child = { id: number; name?: string; admissionNumber?: string; status?: string; currentClass?: unknown }

const heading = { margin: "22px 0 10px", fontSize: 15 } as const

function useChildMarks(child: Child) {
  const marks = useFind<MarkDoc>("marks", `limit=1000&depth=2&where[student][equals]=${child.id}`)
  const published = publishedMarks(marks.rows)
  return { ...marks, published, terms: termsOf(published) }
}

function ResultsTable({ marks, term }: { marks: MarkDoc[]; term: TermInfo }) {
  const rows = resultsForTerm(marks, term.id)
  const average = overallPercent(rows)
  return (
    <div className="content-card">
      <Table heads={["Learning area", "Result", "Level", "Comment"]}>
        {rows.map((row) => (
          <tr key={row.subject}>
            <td>
              <strong>{row.subject}</strong>
            </td>
            <td>{row.percent === null ? "Pending" : `${row.percent}%`}</td>
            <td>{row.level}</td>
            <td>{row.remark}</td>
          </tr>
        ))}
        <tr>
          <td>
            <strong>Overall</strong>
          </td>
          <td>
            <strong>{average === null ? "Pending" : `${average}%`}</strong>
          </td>
          <td>
            <strong>{levelFor(average)}</strong>
          </td>
          <td />
        </tr>
      </Table>
    </div>
  )
}

function FamilyHome({ child }: { child: Child }) {
  const marks = useChildMarks(child)
  const current = useFind<TermInfo>("terms", "limit=1&depth=0&where[isCurrent][equals]=true")
  const term = current.rows[0]
  const attendance = useFind<AttendanceDoc>("attendance", current.loading ? null : attendanceQuery(child.id, term))
  const summary = attendanceSummary(attendance.rows)
  const latest = marks.terms[0]
  const average = latest ? overallPercent(resultsForTerm(marks.published, latest.id)) : null
  const cards: [string, string, string][] = [
    ["ATTENDANCE", summary.percent === null ? "—" : `${summary.percent}%`, summary.total ? `${summary.attended} of ${summary.total} recorded days${term ? ` in ${term.name}` : ""}` : "Nothing recorded yet"],
    ["LATEST AVERAGE", average === null ? "—" : `${average}%`, latest ? `${latest.name} (${levelFor(average)})` : "No published results yet"],
    ["CLASS", nameOf(child.currentClass) || "—", `Admission ${child.admissionNumber ?? ""}`],
  ]
  return (
    <Page title={child.name ?? "Learner"} subtitle="A summary of attendance and the latest published results.">
      <section className="admin-metrics">
        {cards.map(([label, value, detail]) => (
          <article key={label}>
            <span>{label}</span>
            <strong>{value}</strong>
            <small>{detail}</small>
          </article>
        ))}
      </section>
      <h3 style={heading}>{latest ? `Results: ${latest.name}` : "Results"}</h3>
      {latest ? (
        <ResultsTable marks={marks.published} term={latest} />
      ) : (
        <div className="content-card">
          <Empty loading={marks.loading} error={marks.error} count={0} text="No results have been published yet. They will appear here as soon as the school releases them." />
        </div>
      )}
    </Page>
  )
}

function FamilyResults({ child }: { child: Child }) {
  const marks = useChildMarks(child)
  const [picked, setPicked] = useState("")
  const term = marks.terms.find((item) => String(item.id) === picked) ?? marks.terms[0]
  return (
    <Page title="Results" subtitle={`Published results for ${child.name}.`}>
      <div className="admin-actions">
        {marks.terms.length > 0 && (
          <select className="table-select" value={term?.id ?? ""} onChange={(e) => setPicked(e.target.value)}>
            {marks.terms.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        )}
      </div>
      {term ? (
        <ResultsTable marks={marks.published} term={term} />
      ) : (
        <div className="content-card">
          <Empty loading={marks.loading} error={marks.error} count={0} text="No results have been published yet." />
        </div>
      )}
    </Page>
  )
}

function FamilyReports({ child }: { child: Child }) {
  const { schoolName } = useSchoolStore()
  const marks = useChildMarks(child)
  const [msg, setMsg] = useState<Msg>({})
  const [busy, setBusy] = useState<number | null>(null)

  async function download(term: TermInfo) {
    setBusy(term.id)
    try {
      const attendance = attendanceSummary(await fetchAttendance(child.id, term))
      await downloadLiveReport({
        schoolName,
        learner: { name: child.name ?? "Learner", admission: child.admissionNumber ?? "", className: nameOf(child.currentClass) },
        termName: term.name,
        rows: resultsForTerm(marks.published, term.id),
        attendance,
      })
      setMsg({ ok: `${term.name} report downloaded.` })
    } catch (e) {
      setMsg({ err: errorText(e) })
    }
    setBusy(null)
  }

  return (
    <Page title="Reports" subtitle={`Report forms for ${child.name}.`}>
      <div className="admin-actions">
        <Note ok={msg.ok} error={msg.err} />
      </div>
      <div className="content-card">
        <Empty loading={marks.loading} error={marks.error} count={marks.terms.length} text="No report is available yet. Reports appear once the school publishes results." />
        {marks.terms.length > 0 && (
          <Table heads={["Term", "Report form"]}>
            {marks.terms.map((term) => (
              <tr key={term.id}>
                <td>
                  <strong>{term.name}</strong>
                </td>
                <td>
                  <button className="primary-button" disabled={busy === term.id} onClick={() => void download(term)}>
                    {busy === term.id ? "Preparing…" : "Download PDF"}
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

/** The learner and parent portal. Students see themselves; parents see each linked child. */
export function FamilyLive({ page }: { page: string }) {
  const kids = useFind<Child>("students", "limit=50&depth=1&sort=name")
  const [picked, setPicked] = useState("")
  const child = kids.rows.find((kid) => String(kid.id) === picked) ?? kids.rows[0]

  if (kids.loading) return <p style={{ padding: 16 }}>Loading…</p>
  if (!child) {
    return (
      <Page title={page} subtitle="">
        <div className="content-card">
          <p style={{ padding: 16 }}>No learner is linked to this account yet. Please contact the school office.</p>
        </div>
      </Page>
    )
  }

  let content
  if (page === "Home") content = <FamilyHome key={child.id} child={child} />
  else if (page === "Results") content = <FamilyResults key={child.id} child={child} />
  else if (page === "Reports") content = <FamilyReports key={child.id} child={child} />
  else content = <ComingSoon page={page} />

  return (
    <>
      {kids.rows.length > 1 && (
        <div className="admin-actions">
          <select className="table-select" value={child.id} onChange={(e) => setPicked(e.target.value)}>
            {kids.rows.map((kid) => (
              <option key={kid.id} value={kid.id}>
                {kid.name}
              </option>
            ))}
          </select>
        </div>
      )}
      {content}
    </>
  )
}