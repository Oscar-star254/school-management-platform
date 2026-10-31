import { apiFind } from "./api"

export type MarkDoc = {
  id: number

  score?: number | null

  comment?: string | null

  student?: unknown

  assessment?: unknown
}

export type TermInfo = {
  id: number
  name: string
  startDate?: string
  endDate?: string
}

export type SubjectResult = {
  subject: string
  percent: number | null
  level: string
  remark: string
}

export type AttendanceDoc = { id: number; status?: string; date?: string }

export type AttendanceSummary = {
  total: number
  attended: number
  absent: number
  late: number
  excused: number
  percent: number | null
}

const obj = (value: unknown) =>
  value && typeof value === "object" ? (value as Record<string, unknown>) : undefined

export type GradeBand = {
  label: string
  minPercent: number
  remark?: string | null
}

let bands: GradeBand[] = [
  { label: "EE", minPercent: 75, remark: "Exceeds expectations" },

  { label: "ME", minPercent: 41, remark: "Meets expectations" },

  { label: "AE", minPercent: 21, remark: "Approaches expectations" },

  { label: "BE", minPercent: 0, remark: "Needs support" },
]

/** The school's grading levels (set from School Settings). */

export function setGradeBands(next: GradeBand[]) {
  if (next.length) bands = [...next].sort((a, b) => b.minPercent - a.minPercent)
}

const bandFor = (percent: number) =>
  bands.find((band) => percent >= band.minPercent) ?? bands[bands.length - 1]

export const levelFor = (percent: number | null) =>
  percent === null ? "—" : bandFor(percent).label

export const remarkFor = (percent: number | null) =>
  percent === null ? "Pending" : (bandFor(percent).remark ?? "")

/** Only results that the school has published. */

export const publishedMarks = (marks: MarkDoc[]) =>
  marks.filter((mark) => obj(mark.assessment)?.status === "published")

/** Terms that have published results, latest first. */

export function termsOf(marks: MarkDoc[]): TermInfo[] {
  const seen = new Map<number, TermInfo>()

  for (const mark of marks) {
    const term = obj(obj(mark.assessment)?.term)

    if (term && typeof term.id === "number") {
      seen.set(term.id, {
        id: term.id,

        name: String(term.name ?? "Term"),

        startDate: term.startDate as string | undefined,

        endDate: term.endDate as string | undefined,
      })
    }
  }

  return [...seen.values()].sort((a, b) => (b.endDate ?? "").localeCompare(a.endDate ?? ""))
}

/** One row per learning area: the average percentage across that term's published assessments. */

export function resultsForTerm(marks: MarkDoc[], termId: number): SubjectResult[] {
  const bySubject = new Map<string, number[]>()

  for (const mark of marks) {
    const assessment = obj(mark.assessment)

    if (!assessment || obj(assessment.term)?.id !== termId || assessment.status !== "published")
      continue

    const subject = String(obj(assessment.subject)?.name ?? "Learning area")

    const list = bySubject.get(subject) ?? []

    if (typeof mark.score === "number") {
      const max =
        typeof assessment.maxMarks === "number" && assessment.maxMarks > 0
          ? assessment.maxMarks
          : 100

      list.push((mark.score / max) * 100)
    }

    bySubject.set(subject, list)
  }

  return [...bySubject.entries()]

    .sort(([a], [b]) => a.localeCompare(b))

    .map(([subject, values]) => {
      const percent = values.length
        ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length)
        : null

      return {
        subject,
        percent,
        level: levelFor(percent),
        remark: remarkFor(percent),
      }
    })
}

export function overallPercent(rows: SubjectResult[]): number | null {
  const values = rows.map((row) => row.percent).filter((value): value is number => value !== null)

  return values.length
    ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length)
    : null
}

export function attendanceSummary(rows: AttendanceDoc[]): AttendanceSummary {
  const count = (status: string) => rows.filter((row) => row.status === status).length

  const late = count("late")

  const attended = count("present") + late

  return {
    total: rows.length,

    attended,

    absent: count("absent"),

    late,

    excused: count("excused"),

    percent: rows.length ? Math.round((attended / rows.length) * 100) : null,
  }
}

/** Query for one learner's attendance, optionally limited to a term's dates. */

export function attendanceQuery(studentId: number, term?: TermInfo): string {
  let query = `limit=1000&depth=0&where[student][equals]=${studentId}`

  if (term?.startDate && term?.endDate) {
    query += `&where[date][greater_than_equal]=${encodeURIComponent(term.startDate)}&where[date][less_than_equal]=${encodeURIComponent(term.endDate)}`
  }

  return query
}

export const fetchAttendance = (studentId: number, term?: TermInfo) =>
  apiFind<AttendanceDoc>("attendance", attendanceQuery(studentId, term))

export type ReportProfile = {
  principalName?: string | null

  reportFooter?: string | null

  phone?: string | null

  email?: string | null

  address?: string | null

  primaryColor?: string | null

  reportTemplate?: "classic" | "modern" | null

  invoiceTemplate?: "classic" | "modern" | null

  invoiceFooter?: string | null
}

let profile: ReportProfile = {}

/** Details from School Settings that are printed on every report form. */

export function setReportProfile(next: ReportProfile) {
  profile = next
}

export const getReportProfile = () => profile

export async function buildLiveReport(options: {
  schoolName: string

  learner: { name: string; admission: string; className: string }

  termName: string

  rows: SubjectResult[]

  attendance?: AttendanceSummary
}) {
  const { jsPDF } = await import("jspdf")

  const { schoolName, learner, termName, rows, attendance } = options

  const doc = new jsPDF()

  const hex = (profile.primaryColor ?? "#3478c8").replace("#", "")

  const accent = [0, 2, 4].map((index) => Number.parseInt(hex.slice(index, index + 2), 16))

  if (profile.reportTemplate === "modern") {
    doc.setFillColor(accent[0], accent[1], accent[2])

    doc.rect(0, 0, 210, 7, "F")
  }

  doc.setFont("helvetica", "bold")

  doc.setFontSize(18)

  doc.text(schoolName.toUpperCase(), 105, 20, { align: "center" })

  const contact = [profile.address?.replace(/\s*\n\s*/g, ", "), profile.phone, profile.email]
    .filter(Boolean)
    .join("  |  ")

  if (contact) {
    doc.setFontSize(8)

    doc.setFont("helvetica", "normal")

    doc.text(contact, 105, 25, { align: "center" })

    doc.setFont("helvetica", "bold")
  }

  doc.setFontSize(14)

  doc.text("Learner Progress Report", 105, 30, { align: "center" })

  doc.setFont("helvetica", "normal")

  doc.setFontSize(10)

  doc.text(
    `${learner.name}  |  ${learner.admission}  |  ${learner.className}  |  ${termName}`,
    20,
    43,
  )

  doc.line(20, 48, 190, 48)

  doc.setFont("helvetica", "bold")

  doc.text("Learning area", 20, 58)

  doc.text("Result", 110, 58)

  doc.text("Level", 135, 58)

  doc.text("Comment", 155, 58)

  doc.setFont("helvetica", "normal")

  rows.forEach((row, index) => {
    const y = 68 + index * 10

    doc.text(row.subject, 20, y)

    doc.text(row.percent === null ? "Pending" : `${row.percent}%`, 110, y)

    doc.text(row.level, 135, y)

    doc.text(row.remark, 155, y)
  })

  const end = 68 + rows.length * 10 + 2

  doc.line(20, end, 190, end)

  const average = overallPercent(rows)

  doc.setFont("helvetica", "bold")

  doc.text(
    `Overall: ${average === null ? "Pending" : `${average}% (${levelFor(average)})`}`,
    20,
    end + 12,
  )

  doc.setFont("helvetica", "normal")

  if (attendance && attendance.total > 0) {
    doc.text(
      `Attendance: ${attendance.attended} of ${attendance.total} recorded days (${attendance.percent}%)`,
      20,
      end + 24,
    )
  }

  doc.setFontSize(10)

  if (profile.principalName) doc.text(`Head teacher: ${profile.principalName}`, 20, 252)

  if (profile.reportFooter) doc.text(doc.splitTextToSize(profile.reportFooter, 170), 20, 262)

  doc.text(`Issued ${new Date().toLocaleDateString("en-KE")} from the school system.`, 20, 282)

  return doc.output("blob")
}

export async function downloadLiveReport(options: {
  schoolName: string

  learner: { name: string; admission: string; className: string }

  termName: string

  rows: SubjectResult[]

  attendance?: AttendanceSummary
}) {
  const blob = await buildLiveReport(options)

  const url = URL.createObjectURL(blob)

  const link = document.createElement("a")

  link.href = url

  link.download = `${options.learner.name.replace(/ /g, "-")}-${options.termName.replace(/ /g, "-")}.pdf`

  link.click()

  URL.revokeObjectURL(url)
}
