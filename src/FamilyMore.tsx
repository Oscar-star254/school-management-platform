import { useState } from "react"

import { getCurrentUser } from "./api"
import { Empty, Page, relId } from "./AdminPeople"
import { FamilyAssignments } from "./AssignmentsLive"
import { Table, useFind } from "./LiveShell"
import { TimetableBody } from "./Timetable"
import { attendanceSummary } from "./resultsData"
import type { AttendanceDoc, TermInfo } from "./resultsData"

type Child = { id: number; name?: string; currentClass?: unknown }
type AttendanceRow = AttendanceDoc & { note?: string | null }

const STATUS_LABELS: Record<string, string> = { present: "Present", absent: "Absent", late: "Late", excused: "Excused" }
const heading = { margin: "22px 0 10px", fontSize: 15 } as const

function FamilyAttendance({ child }: { child: Child }) {
  const current = useFind<TermInfo>("terms", "limit=1&depth=0&where[isCurrent][equals]=true")
  const attendance = useFind<AttendanceRow>("attendance", `limit=1000&depth=0&sort=-date&where[student][equals]=${child.id}`)
  const term = current.rows[0]
  const inTerm = (row: AttendanceRow) =>
    !term?.startDate || !term.endDate || ((row.date ?? "").slice(0, 10) >= term.startDate.slice(0, 10) && (row.date ?? "").slice(0, 10) <= term.endDate.slice(0, 10))
  const rows = attendance.rows.filter(inTerm)
  const summary = attendanceSummary(rows)
  const cards: [string, string | number, string][] = [
    ["ATTENDANCE", summary.percent === null ? "—" : `${summary.percent}%`, term ? term.name : "All recorded days"],
    ["PRESENT", summary.attended - summary.late, "days"],
    ["LATE", summary.late, "days"],
    ["ABSENT", summary.absent, `days${summary.excused ? ` (${summary.excused} excused)` : ""}`],
  ]
  const missed = rows.filter((row) => row.status !== "present")
  return (
    <>
      <section className="admin-metrics">
        {cards.map(([label, value, detail]) => (
          <article key={label}>
            <span>{label}</span>
            <strong>{value}</strong>
            <small>{detail}</small>
          </article>
        ))}
      </section>
      <h3 style={heading}>Absences and late arrivals</h3>
      <div className="content-card">
        <Empty loading={attendance.loading} error={attendance.error} count={missed.length} text="Nothing to report. No absences or late arrivals recorded." />
        {missed.length > 0 && (
          <Table heads={["Date", "Status", "Note"]}>
            {missed.map((row) => (
              <tr key={row.id}>
                <td>{(row.date ?? "").slice(0, 10)}</td>
                <td>{STATUS_LABELS[row.status ?? ""] ?? row.status}</td>
                <td>{row.note || "—"}</td>
              </tr>
            ))}
          </Table>
        )}
      </div>
    </>
  )
}

const TABS: [string, string][] = [
  ["attendance", "Attendance"],
  ["assignments", "Assignments"],
  ["timetable", "Timetable"],
]

/** The family portal's "More" page: attendance, assignments and timetable for one learner. */
export function FamilyMore({ child }: { child: Child }) {
  const [tab, setTab] = useState("attendance")
  const canSubmit = getCurrentUser()?.role === "student"
  return (
    <Page title="More" subtitle={`Attendance, assignments and timetable for ${child.name ?? "your learner"}.`}>
      <div className="admin-actions">
        {TABS.map(([key, label]) => (
          <button key={key} className={tab === key ? "primary-button" : "secondary-button"} onClick={() => setTab(key)}>
            {label}
          </button>
        ))}
      </div>
      {tab === "attendance" && <FamilyAttendance child={child} />}
      {tab === "assignments" && <FamilyAssignments child={child} canSubmit={canSubmit} />}
      {tab === "timetable" && <TimetableBody classId={relId(child.currentClass)} showTeacher />}
    </Page>
  )
}