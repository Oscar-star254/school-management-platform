import { useMemo, useState } from "react"

import { apiPublishReports } from "./api"

import { Empty, Note, Page, errorText, nameOf, relId } from "./AdminPeople"

import type { Msg } from "./AdminPeople"

import { Table, useFind } from "./LiveShell"

import {
  attendanceSummary,
  buildLiveReport,
  downloadLiveReport,
  fetchAttendance,
  resultsForTerm,
} from "./resultsData"

import type { MarkDoc, TermInfo } from "./resultsData"

import { useSchoolStore } from "./schoolStore"

type Assessment = { id: number; status?: string; term?: unknown; class?: unknown }

type Student = {
  id: number
  name?: string
  admissionNumber?: string
  status?: string
}

type PublishedReport = {
  id: number
  student?: unknown
  term?: unknown
  publishedAt?: string
}

type Option = { id: number; name?: string; startDate?: string; endDate?: string }

export function ReportFormsLive() {
  const { schoolName } = useSchoolStore()

  const terms = useFind<Option>("terms", "limit=100&depth=0&sort=-startDate")

  const classes = useFind<Option>("classes", "limit=300&depth=0&sort=name")

  const assessments = useFind<Assessment>("assessments", "limit=1000&depth=0")

  const [termPick, setTermPick] = useState("")

  const [classPick, setClassPick] = useState("")

  const [selected, setSelected] = useState<number[]>([])

  const [msg, setMsg] = useState<Msg>({})

  const [busy, setBusy] = useState<number | "all" | "selected" | null>(null)

  const termId = termPick || String(terms.rows[0]?.id ?? "")

  const classId = classPick || String(classes.rows[0]?.id ?? "")

  const term = terms.rows.find((item) => String(item.id) === termId)

  const klass = classes.rows.find((item) => String(item.id) === classId)

  const publishedIds = assessments.rows

    .filter(
      (a) =>
        a.status === "published" &&
        String(relId(a.term)) === termId &&
        String(relId(a.class)) === classId,
    )

    .map((a) => a.id)

  const students = useFind<Student>(
    "students",
    classId ? `limit=500&depth=0&sort=name&where[currentClass][equals]=${classId}` : null,
  )

  const marks = useFind<MarkDoc>(
    "marks",
    publishedIds.length
      ? `limit=5000&depth=2&where[assessment][in]=${publishedIds.join(",")}`
      : null,
  )

  const publications = useFind<PublishedReport>(
    "report-publications",

    classId && termId
      ? `limit=1000&depth=0&where[class][equals]=${classId}&where[term][equals]=${termId}`
      : null,
  )

  const roster = students.rows.filter((student) => student.status === "active")

  const publishedStudentIds = useMemo(
    () => new Set(publications.rows.map((row) => relId(row.student))),
    [publications.rows],
  )

  const ready = roster.filter(
    (student) =>
      resultsForTerm(
        marks.rows.filter((mark) => relId(mark.student) === student.id),

        term?.id ?? 0,
      ).length > 0,
  )

  function setClass(id: string) {
    setClassPick(id)

    setSelected([])

    setMsg({})
  }

  async function reportFor(student: Student, preview: boolean) {
    if (!term) return

    const previewWindow = preview ? window.open("about:blank", "_blank") : null

    if (preview && !previewWindow) {
      setMsg({ err: "Allow pop-ups to preview a report form." })

      return
    }

    setBusy(student.id)

    try {
      const own = marks.rows.filter((mark) => relId(mark.student) === student.id)

      const info: TermInfo = {
        id: term.id,
        name: term.name ?? "Term",
        startDate: term.startDate,
        endDate: term.endDate,
      }

      const options = {
        schoolName,

        learner: {
          name: student.name ?? "Learner",
          admission: student.admissionNumber ?? "",
          className: klass?.name ?? "",
        },

        termName: info.name,

        rows: resultsForTerm(own, term.id),

        attendance: attendanceSummary(await fetchAttendance(student.id, info)),
      }

      if (preview) {
        const blob = await buildLiveReport(options)

        const url = URL.createObjectURL(blob)

        previewWindow!.location.href = url

        window.setTimeout(() => URL.revokeObjectURL(url), 60_000)
      } else {
        await downloadLiveReport(options)

        setMsg({ ok: `Report for ${student.name} downloaded.` })
      }
    } catch (e) {
      previewWindow?.close()

      setMsg({ err: errorText(e) })
    } finally {
      setBusy(null)
    }
  }

  async function publish(studentIds?: number[]) {
    if (!term || !classId) return

    const target = studentIds
      ? `${studentIds.length} selected report${studentIds.length === 1 ? "" : "s"}`
      : `all ready reports for ${nameOf(klass)}`

    if (!window.confirm(`Publish ${target} for ${term.name ?? "this term"} to family portals?`))
      return

    const mode = studentIds ? "selected" : "all"

    setBusy(mode)

    setMsg({})

    try {
      const result = await apiPublishReports(Number(classId), term.id, studentIds)

      setMsg({
        ok: `${result.published} report${result.published === 1 ? "" : "s"} published${
          result.alreadyPublished ? `, ${result.alreadyPublished} already published` : ""
        }${
          result.skippedWithoutResults
            ? `, ${result.skippedWithoutResults} without published results`
            : ""
        }.`,
      })

      setSelected([])

      await publications.reload()
    } catch (e) {
      setMsg({ err: errorText(e) })
    } finally {
      setBusy(null)
    }
  }

  return (
    <Page
      title="Report forms"
      subtitle="Choose a class, preview learner reports, and publish them to family portals individually or together."
    >
      <div className="report-class-grid" aria-label="Select class">
        {classes.rows.map((item) => (
          <button
            key={item.id}
            className={`report-class-card ${classId === String(item.id) ? "selected" : ""}`}
            onClick={() => setClass(String(item.id))}
          >
            <span>{item.name ?? "Class"}</span>
            <strong>{classId === String(item.id) ? "Selected class" : "View reports"}</strong>
          </button>
        ))}
        {!classes.loading && classes.rows.length === 0 && (
          <p className="content-card">No classes have been set up yet.</p>
        )}
      </div>
      <div className="admin-actions">
        <select
          aria-label="Report term"
          className="table-select"
          value={termId}
          onChange={(e) => {
            setTermPick(e.target.value)
            setSelected([])
          }}
        >
          {terms.rows.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
        <button
          className="primary-button"
          disabled={!ready.length || busy !== null}
          onClick={() => void publish()}
        >
          {busy === "all" ? "Publishing…" : "Publish all reports"}
        </button>
        <button
          className="secondary-button"
          disabled={!selected.length || busy !== null}
          onClick={() => void publish(selected)}
        >
          {busy === "selected" ? "Publishing…" : `Publish selected (${selected.length})`}
        </button>
        <Note ok={msg.ok} error={msg.err} />
      </div>
      {!assessments.loading && publishedIds.length === 0 && (
        <p className="save-message">
          No results have been published for {nameOf(klass)} in this term yet.
        </p>
      )}
      <div className="content-card">
        <Empty
          loading={students.loading || publications.loading}
          error={students.error || marks.error || publications.error}
          count={roster.length}
          text="No active learners in this class."
        />
        {roster.length > 0 && (
          <Table
            heads={[
              "",
              "Admission no.",
              "Learner",
              "Learning areas published",
              "Family status",
              "Report form",
            ]}
          >
            {roster.map((student) => {
              const subjects = resultsForTerm(
                marks.rows.filter((mark) => relId(mark.student) === student.id),

                term?.id ?? 0,
              ).length

              const isPublished = publishedStudentIds.has(student.id)

              return (
                <tr key={student.id}>
                  <td>
                    <input
                      type="checkbox"
                      aria-label={`Select report for ${student.name}`}
                      checked={selected.includes(student.id)}
                      disabled={subjects === 0 || isPublished || busy !== null}
                      onChange={(event) =>
                        setSelected(
                          event.target.checked
                            ? [...selected, student.id]
                            : selected.filter((id) => id !== student.id),
                        )
                      }
                    />
                  </td>
                  <td>{student.admissionNumber}</td>
                  <td>
                    <strong>{student.name}</strong>
                  </td>
                  <td>{subjects}</td>
                  <td>
                    {isPublished
                      ? "Published"
                      : subjects
                        ? "Ready to publish"
                        : "Awaiting published results"}
                  </td>
                  <td>
                    <button
                      className="secondary-button"
                      disabled={busy !== null || subjects === 0}
                      onClick={() => void reportFor(student, true)}
                    >
                      {busy === student.id ? "Preparing…" : "Preview"}
                    </button>{" "}
                    <button
                      className="secondary-button"
                      disabled={busy !== null || subjects === 0}
                      onClick={() => void reportFor(student, false)}
                    >
                      Download
                    </button>{" "}
                    {!isPublished && (
                      <button
                        className="primary-button"
                        disabled={busy !== null || subjects === 0}
                        onClick={() => void publish([student.id])}
                      >
                        Publish
                      </button>
                    )}
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
