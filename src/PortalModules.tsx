import { useMemo, useState } from "react"
import {
  ArrowDownToLine,
  BookOpen,
  CalendarDays,
  Check,
  CircleDollarSign,
  Database,
  FileSpreadsheet,
  FileText,
  GraduationCap,
  Megaphone,
  Plus,
  Search,
  Settings,
  ShieldCheck,
  Smartphone,
  Upload,
  UserRoundCog,
  UsersRound,
} from "lucide-react"
import { LearnerStatus, schoolActions, useSchoolStore } from "./schoolStore"

const assignments = [
  ["Mathematics", "Fractions in daily life", "24 Jun", "Open"],
  ["English", "Write a descriptive composition", "27 Jun", "Open"],
  ["Science & Technology", "Home energy audit", "01 Jul", "Not started"],
]

function downloadCsv(learners: ReturnType<typeof useSchoolStore>["learners"]) {
  const body = [
    "Admission number,Name,Class,Status,Guardian,Phone",
    ...learners.map((learner) =>
      [
        learner.admission,
        learner.name,
        learner.grade,
        learner.status,
        learner.guardian,
        learner.phone,
      ].join(","),
    ),
  ].join("\n")
  const link = document.createElement("a")
  link.href = URL.createObjectURL(new Blob([body], { type: "text/csv" }))
  link.download = "greenfield-learners.csv"
  link.click()
  URL.revokeObjectURL(link.href)
}

function Header({
  title,
  subtitle,
  action,
}: {
  title: string
  subtitle: string
  action?: React.ReactNode
}) {
  return (
    <div className="page-heading module-heading">
      <div>
        <h2>{title}</h2>
        <p>{subtitle}</p>
      </div>
      {action}
    </div>
  )
}

function BlankModule({
  title,
  subtitle,
  icon: Icon,
  children,
}: {
  title: string
  subtitle: string
  icon: typeof BookOpen
  children?: React.ReactNode
}) {
  return (
    <>
      <Header title={title} subtitle={subtitle} />
      <div className="content-card module-panel">
        <span className="module-icon">
          <Icon size={20} />
        </span>
        {children}
      </div>
    </>
  )
}

export function StudentModule({ page }: { page: string }) {
  const [submitted, setSubmitted] = useState(false)
  if (page === "More")
    return (
      <>
        <Header
          title="Learning and profile"
          subtitle="Assignments, materials, attendance and account settings."
        />
        <div className="module-grid">
          <section className="content-card">
            <div className="card-toolbar">
              <div>
                <h2>Assignments</h2>
                <p>Three current activities</p>
              </div>
              <FileText size={18} />
            </div>
            <div className="compact-list">
              {assignments.map(([area, title, due, status]) => (
                <article key={title}>
                  <span className="module-icon small">
                    <BookOpen size={15} />
                  </span>
                  <div>
                    <strong>{title}</strong>
                    <p>
                      {area} · Due {due}
                    </p>
                  </div>
                  <span className="status-good">{status}</span>
                </article>
              ))}
            </div>
            <div className="submit-row">
              <input
                aria-label="Assignment response"
                placeholder="Add a response for Fractions in daily life"
              />
              <button
                className="primary-button"
                onClick={() => setSubmitted(true)}
              >
                <Upload size={15} /> {submitted ? "Submitted" : "Submit work"}
              </button>
            </div>
          </section>
          <section className="content-card">
            <div className="card-toolbar">
              <div>
                <h2>Available offline</h2>
                <p>Downloaded learning materials</p>
              </div>
              <ArrowDownToLine size={18} />
            </div>
            <div className="compact-list">
              {[
                "Grade 5 Mathematics revision.pdf",
                "English reading guide.pdf",
                "Term 2 calendar.pdf",
              ].map((file) => (
                <article key={file}>
                  <span className="module-icon small">
                    <FileText size={15} />
                  </span>
                  <div>
                    <strong>{file}</strong>
                    <p>PDF · Available offline</p>
                  </div>
                  <Check size={15} className="success-icon" />
                </article>
              ))}
            </div>
          </section>
          <section className="content-card">
            <div className="card-toolbar">
              <div>
                <h2>Attendance</h2>
                <p>June 2026</p>
              </div>
              <CalendarDays size={18} />
            </div>
            <div className="attendance-summary">
              <strong>96.4%</strong>
              <p>54 present · 1 absent · 1 late</p>
              <div className="progress-track">
                <i />
              </div>
            </div>
          </section>
          <section className="content-card">
            <div className="card-toolbar">
              <div>
                <h2>Profile and device</h2>
                <p>Amani Mwangi · ADM-1042</p>
              </div>
              <Settings size={18} />
            </div>
            <div className="settings-list">
              <button>
                Change password <span>›</span>
              </button>
              <button>
                Linked learner accounts <span>1</span>
              </button>
              <button>
                Offline storage <span>18.4 MB</span>
              </button>
              <button className="danger-text">Clear offline data</button>
            </div>
          </section>
        </div>
      </>
    )
  return null
}

export function TeacherModule({ page }: { page: string }) {
  const details: Record<string, [string, string, typeof BookOpen]> = {
    Class: [
      "Class teacher records",
      "Complete competencies, values and learner comments.",
      UsersRound,
    ],
    Assignments: [
      "Assignments",
      "Create, publish and grade class activities.",
      FileText,
    ],
    Notices: [
      "Class notices",
      "Communication sent to Grade 5 East guardians.",
      Megaphone,
    ],
    Timetable: [
      "Weekly timetable",
      "Your assigned classes and learning areas.",
      CalendarDays,
    ],
  }
  const [title, subtitle, Icon] = details[page] ?? details.Assignments
  if (page === "Timetable")
    return (
      <>
        <Header title={title} subtitle={subtitle} />
        <div className="content-card timetable">
          <div className="timetable-row timetable-head">
            <strong>Time</strong>
            {["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"].map(
              (day) => (
                <strong key={day}>{day}</strong>
              ),
            )}
          </div>
          {["08:00", "09:20", "11:00", "13:40"].map((time, row) => (
            <div className="timetable-row" key={time}>
              <time>{time}</time>
              {[
                "English",
                "Mathematics",
                "Science",
                "Social Studies",
                "Creative Arts",
              ].map((subject, col) => (
                <span key={subject}>
                  {(row + col) % 3 === 0 ? (
                    <>
                      <strong>{subject}</strong>
                      <small>5 East</small>
                    </>
                  ) : (
                    "—"
                  )}
                </span>
              ))}
            </div>
          ))}
        </div>
      </>
    )
  if (page === "Assignments")
    return (
      <>
        <Header
          title={title}
          subtitle={subtitle}
          action={
            <button className="primary-button">
              <Plus size={15} /> New assignment
            </button>
          }
        />
        <div className="content-card">
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Learning area</th>
                  <th>Assignment</th>
                  <th>Due</th>
                  <th>Submissions</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {assignments.map(([area, name, due]) => (
                  <tr key={name}>
                    <td>{area}</td>
                    <td>
                      <strong>{name}</strong>
                    </td>
                    <td>{due}</td>
                    <td>24 / 32</td>
                    <td>
                      <span className="status-good">Published</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </>
    )
  return (
    <BlankModule title={title} subtitle={subtitle} icon={Icon}>
      <div className="module-copy">
        <h3>
          {page === "Class"
            ? "19 of 32 learner records complete"
            : "Three notices published this term"}
        </h3>
        <p>
          Work saved on this device is queued automatically whenever the
          connection is unavailable.
        </p>
        <button className="primary-button">
          {page === "Class" ? "Continue class records" : "Create notice"}
        </button>
      </div>
    </BlankModule>
  )
}

const adminNavGroups = {
  Overview: ["Dashboard"],
  People: ["Learners", "Guardians", "Staff"],
  Academics: [
    "Terms & classes",
    "Learning areas",
    "Results monitor",
    "Report forms",
    "Timetable",
  ],
  Finance: ["Fee structures", "Invoices", "Payments", "Reconciliation"],
  Communication: ["Notices", "SMS log"],
  System: ["Settings", "Users & roles", "Audit log", "Devices", "Backups"],
}

export const adminPages = Object.values(adminNavGroups).flat()
export { adminNavGroups }

function AdminTable({ type }: { type: string }) {
  const school = useSchoolStore()
  if (type === "Learners")
    return (
      <div className="content-card">
        <div className="card-toolbar">
          <div className="search-box">
            <Search size={15} />
            <input placeholder="Search learners" />
          </div>
          <button
            className="secondary-button"
            onClick={() => downloadCsv(school.learners)}
          >
            <FileSpreadsheet size={15} /> Export CSV
          </button>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Admission no.</th>
                <th>Learner</th>
                <th>Class</th>
                <th>Status</th>
                <th>Account</th>
              </tr>
            </thead>
            <tbody>
              {school.learners.map((learner) => (
                <tr key={learner.admission}>
                  <td>{learner.admission}</td>
                  <td>
                    <strong>{learner.name}</strong>
                  </td>
                  <td>{learner.grade}</td>
                  <td>
                    <select
                      className="table-select"
                      value={learner.status}
                      onChange={(event) =>
                        schoolActions.updateLearner(learner.admission, {
                          status: event.target.value as LearnerStatus,
                        })
                      }
                    >
                      <option>Active</option>
                      <option>Completed</option>
                      <option>Transferred</option>
                    </select>
                  </td>
                  <td>
                    {learner.status === "Active" ? "Login ready" : "Archived"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    )
  const rows = {
    Payments: [
      ["MPESA-QK72A", "Amani Mwangi", "KES 8,000", "Confirmed"],
      ["MPESA-QK71P", "Chebet Koech", "KES 12,500", "Confirmed"],
    ],
    "Audit log": [
      ["18 Jun 10:42", "Tracy Wafula", "Updated scores", "Grade 5 East"],
      ["18 Jun 10:31", "Jane Njeri", "Released report", "ADM-1042"],
    ],
    "Results monitor": [
      ["Grade 5 East", "Mathematics", "29 / 32", "91%"],
      ["Grade 5 East", "English", "32 / 32", "100%"],
    ],
  }[type] ?? [["Current configuration", type, "Active", "Up to date"]]
  return (
    <div className="content-card">
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Reference</th>
              <th>Detail</th>
              <th>Progress / amount</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.join()}>
                {row.map((cell, index) => (
                  <td key={cell}>
                    {index === 1 ? <strong>{cell}</strong> : cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function LearnerRegistration() {
  const [open, setOpen] = useState(false)
  const [message, setMessage] = useState("")
  const [form, setForm] = useState({
    admission: "",
    name: "",
    grade: "Grade 5 East",
    guardian: "",
    phone: "",
  })
  function register(event: React.FormEvent) {
    event.preventDefault()
    try {
      schoolActions.addLearner({ ...form, status: "Active" })
      setMessage(
        `${form.name} registered. Login account ${form.admission} is ready.`,
      )
      setForm({
        admission: "",
        name: "",
        grade: "Grade 5 East",
        guardian: "",
        phone: "",
      })
      setOpen(false)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Registration failed")
    }
  }
  return (
    <>
      <div className="admin-actions">
        <button className="primary-button" onClick={() => setOpen(!open)}>
          <Plus size={15} /> {open ? "Close registration" : "Register learner"}
        </button>
        {message && (
          <span className="save-message">
            <Check size={14} /> {message}
          </span>
        )}
      </div>
      {open && (
        <form className="content-card record-form" onSubmit={register}>
          <label>
            <span>Admission number</span>
            <input
              required
              value={form.admission}
              onChange={(event) =>
                setForm({
                  ...form,
                  admission: event.target.value.toUpperCase(),
                })
              }
              placeholder="ADM-1047"
            />
          </label>
          <label>
            <span>Learner name</span>
            <input
              required
              value={form.name}
              onChange={(event) =>
                setForm({ ...form, name: event.target.value })
              }
            />
          </label>
          <label>
            <span>Class</span>
            <select
              value={form.grade}
              onChange={(event) =>
                setForm({ ...form, grade: event.target.value })
              }
            >
              {[
                "Grade 1 East",
                "Grade 5 East",
                "Grade 5 West",
                "Grade 9 East",
              ].map((grade) => (
                <option key={grade}>{grade}</option>
              ))}
            </select>
          </label>
          <label>
            <span>Guardian</span>
            <input
              required
              value={form.guardian}
              onChange={(event) =>
                setForm({ ...form, guardian: event.target.value })
              }
            />
          </label>
          <label>
            <span>Guardian phone</span>
            <input
              required
              pattern="254[0-9]{9}"
              value={form.phone}
              onChange={(event) =>
                setForm({ ...form, phone: event.target.value })
              }
              placeholder="254700123456"
            />
          </label>
          <button className="primary-button" type="submit">
            Create learner and account
          </button>
        </form>
      )}
    </>
  )
}

function SchoolSettings() {
  const school = useSchoolStore()
  const [name, setName] = useState(school.schoolName)
  const [motto, setMotto] = useState(school.motto)
  const [saved, setSaved] = useState(false)
  return (
    <form
      className="content-card settings-form"
      onSubmit={(event) => {
        event.preventDefault()
        schoolActions.updateSchool({
          schoolName: name.trim(),
          motto: motto.trim(),
        })
        setSaved(true)
      }}
    >
      <div>
        <h2>School identity</h2>
        <p>The name and motto update every portal immediately.</p>
      </div>
      <label>
        <span>School name</span>
        <input
          required
          value={name}
          onChange={(event) => {
            setName(event.target.value)
            setSaved(false)
          }}
        />
      </label>
      <label>
        <span>Motto</span>
        <input
          required
          value={motto}
          onChange={(event) => {
            setMotto(event.target.value)
            setSaved(false)
          }}
        />
      </label>
      <div className="form-footer">
        <button
          className="secondary-button"
          type="button"
          onClick={() => schoolActions.resetDemo()}
        >
          Restore demonstration data
        </button>
        <button className="primary-button" type="submit">
          <Check size={15} /> Save settings
        </button>
        {saved && <span className="save-message">Settings saved</span>}
      </div>
    </form>
  )
}

export function AdminContent({ page }: { page: string }) {
  const school = useSchoolStore()
  const title = page === "Dashboard" ? "School overview" : page
  const iconMap: Record<string, typeof BookOpen> = {
    Learners: GraduationCap,
    Guardians: UsersRound,
    Staff: UserRoundCog,
    "Terms & classes": CalendarDays,
    "Learning areas": BookOpen,
    "Results monitor": FileSpreadsheet,
    "Report forms": FileText,
    "Fee structures": CircleDollarSign,
    Invoices: FileText,
    Payments: CircleDollarSign,
    Notices: Megaphone,
    Settings,
    "Users & roles": ShieldCheck,
    "Audit log": Database,
    Devices: Smartphone,
    Backups: Database,
  }
  const Icon = iconMap[page] ?? Settings
  const figures = useMemo(
    () => [
      ["ATTENDANCE TODAY", "94.8%", "612 of 646 learners"],
      ["RESULTS COMPLETE", "82%", "Term 2 across all classes"],
      ["FEES COLLECTED", "KES 3.8M", "76% of term invoices"],
      ["REPORTS READY", "438", "68% of learners"],
    ],
    [],
  )
  if (page === "Dashboard")
    return (
      <>
        <Header title={title} subtitle="Wednesday, 18 June 2026 · Term 2" />
        <section className="admin-metrics">
          {figures.map(([label, value, detail]) => (
            <article key={label}>
              <span>{label}</span>
              <strong>{value}</strong>
              <small>{detail}</small>
            </article>
          ))}
        </section>
        <div className="module-grid">
          <AdminTable type="Results monitor" />
          <AdminTable type="Payments" />
        </div>
      </>
    )
  if (page === "Settings")
    return (
      <>
        <Header
          title="School settings"
          subtitle={`Branding and identity for ${school.schoolName}.`}
        />
        <SchoolSettings />
      </>
    )
  if (page === "Learners")
    return (
      <>
        <Header
          title="Learners"
          subtitle="Register learners, issue accounts and manage lifecycle status."
        />
        <LearnerRegistration />
        <AdminTable type="Learners" />
      </>
    )
  return (
    <>
      <Header
        title={title}
        subtitle={`Manage ${page.toLowerCase()} for ${school.schoolName}.`}
        action={
          <button
            className="primary-button"
            onClick={() =>
              window.alert(
                `${page}: record editor opened for authorised administrators.`,
              )
            }
          >
            <Plus size={15} /> Add record
          </button>
        }
      />
      <div className="admin-context">
        <span className="module-icon">
          <Icon size={18} />
        </span>
        <p>
          Changes to sensitive records are versioned and included in the school
          audit log.
        </p>
      </div>
      <AdminTable type={page} />
    </>
  )
}
