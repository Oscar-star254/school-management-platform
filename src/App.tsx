import { FormEvent, ReactNode, useState } from "react"
import {
  ArrowDownToLine,
  Bell,
  BookOpen,
  CalendarDays,
  Check,
  ChevronDown,
  CircleHelp,
  Clock3,
  Download,
  Eye,
  EyeOff,
  FileText,
  GraduationCap,
  Home,
  LockKeyhole,
  Menu,
  Phone,
  Search,
  ShieldCheck,
  UserRound,
  UsersRound,
  WalletCards,
  Wifi,
  X,
} from "lucide-react"
import {
  AdminContent,
  StudentModule,
  TeacherModule,
  adminNavGroups,
} from "./PortalModules"
import {
  SUBJECTS,
  activeLearner,
  learnerResults,
  reportReady,
  schoolActions,
  setActiveLearner,
  useSchoolStore,
} from "./schoolStore"

type LoginKind = "student" | "teacher"
type Portal = "login" | "student" | "teacher" | "admin"

const results = [
  {
    area: "English",
    score: 78,
    level: "EE",
    remark: "Consistently applies language skills",
  },
  {
    area: "Kiswahili",
    score: 68,
    level: "ME",
    remark: "Communicates ideas clearly",
  },
  {
    area: "Mathematics",
    score: 84,
    level: "EE",
    remark: "Solves problems confidently",
  },
  {
    area: "Science & Technology",
    score: 72,
    level: "ME",
    remark: "Shows sound practical understanding",
  },
  {
    area: "Social Studies",
    score: 64,
    level: "ME",
    remark: "Demonstrates good subject knowledge",
  },
]

const notices = [
  {
    date: "18 Jun",
    title: "Term 2 parents meeting",
    body: "The meeting will be held on Friday, 28 June at 2:00 pm.",
  },
  {
    date: "14 Jun",
    title: "Grade 5 educational visit",
    body: "Consent forms should be returned to the class teacher by Monday.",
  },
  {
    date: "10 Jun",
    title: "Mid-term break",
    body: "Learners break on 20 June and resume on 24 June.",
  },
]

function SchoolBuilding() {
  return (
    <g opacity=".62" fill="#d6dde0">
      <path d="M44 53h212v105H44z" />
      <path d="m32 55 118-42 118 42H32Z" />
      <path d="M102 37h96v121h-96z" />
      <path d="m91 40 59-32 59 32H91Z" />
      <circle cx="150" cy="38" r="13" fill="#f5f7f8" />
      <path d="M149 29h3v10l7 4-2 3-8-5z" fill="#b2bdc2" />
      {[61, 96, 181, 216].map((x) => (
        <g key={x} fill="#f5f7f8">
          <rect x={x} y="72" width="22" height="25" rx="2" />
          <rect x={x} y="111" width="22" height="25" rx="2" />
        </g>
      ))}
      <path d="M131 105h38v53h-38z" fill="#c0c9cd" />
    </g>
  )
}

function LoginIllustration({ kind }: { kind: LoginKind }) {
  return (
    <svg
      className="login-illustration"
      viewBox="0 0 300 220"
      role="img"
      aria-label={`${kind} login illustration`}
    >
      <SchoolBuilding />
      <ellipse cx="150" cy="207" rx="52" ry="6" fill="#dfe4e6" />
      {kind === "student" ? (
        <g>
          <path
            d="M113 121c-16 4-23 22-23 45v23h25l5-64zM187 121c16 4 23 22 23 45v23h-25l-5-64z"
            fill="#36ad68"
          />
          <path d="M124 126h52l11 59h-74z" fill="#8e5bc4" />
          <path d="m136 126 14 29 14-29z" fill="#fff" />
          <path d="m147 132 6 1 4 19-7 9-7-9z" fill="#e8a832" />
          <circle cx="150" cy="94" r="31" fill="#ad6d4f" />
          <path
            d="M120 93c0-31 20-43 39-37 17 5 24 21 21 37-10-5-16-14-19-21-11 12-25 17-41 21Z"
            fill="#26333b"
          />
          <circle cx="139" cy="96" r="2.5" fill="#26333b" />
          <circle cx="162" cy="96" r="2.5" fill="#26333b" />
          <path
            d="M142 108c6 5 12 5 18 0"
            fill="none"
            stroke="#fff"
            strokeWidth="3"
            strokeLinecap="round"
          />
          <path d="M125 178h20v29h-22zM157 178h20l2 29h-22z" fill="#70459c" />
          <path d="M119 204h29v7h-29zM155 204h29v7h-29z" fill="#26333b" />
          <path
            d="M111 129c-9 17-10 33-4 48M189 129c9 17 10 33 4 48"
            fill="none"
            stroke="#8b513e"
            strokeWidth="8"
            strokeLinecap="round"
          />
          <circle cx="107" cy="178" r="6" fill="#ad6d4f" />
          <circle cx="193" cy="178" r="6" fill="#ad6d4f" />
        </g>
      ) : (
        <g>
          <path d="M126 120h48l13 71h-74z" fill="#3cc67a" />
          <path d="m139 119 11 21 12-21z" fill="#fff" />
          <circle cx="150" cy="88" r="31" fill="#a9694c" />
          <path
            d="M119 91c-3-27 10-42 31-42 27 0 37 22 31 48l-12-5c1-13-2-23-12-29-7 13-21 20-38 21z"
            fill="#202c33"
          />
          <path
            d="M120 83c-9 27 3 41 13 44V83zM178 80c9 28-3 43-13 47V82z"
            fill="#202c33"
          />
          <circle cx="140" cy="91" r="2.5" fill="#26333b" />
          <circle cx="160" cy="91" r="2.5" fill="#26333b" />
          <path
            d="M142 103c5 4 11 4 16 0"
            fill="none"
            stroke="#fff"
            strokeWidth="3"
            strokeLinecap="round"
          />
          <path d="M128 188h18v20h-20zM158 188h18l1 20h-20z" fill="#26333b" />
          <path d="M122 205h28v7h-28zM154 205h28v7h-28z" fill="#202c33" />
          <path
            d="M124 130c-11 16-11 31-4 43M176 128c10 14 15 24 18 37"
            fill="none"
            stroke="#9d5d45"
            strokeWidth="8"
            strokeLinecap="round"
          />
          <path d="M96 159h37v39H96z" fill="#8e5bc4" />
          <path
            d="M106 159v-9h17v9"
            fill="none"
            stroke="#70459c"
            strokeWidth="5"
          />
          <path d="m163 126 26 9-9 38-27-9z" fill="#fff" />
          <path
            d="m168 136 13 4M166 145l13 4M163 154l13 4"
            stroke="#b8c0c4"
            strokeWidth="2"
          />
        </g>
      )}
    </svg>
  )
}

function Modal({
  title,
  children,
  onClose,
}: {
  title: string
  children: ReactNode
  onClose: () => void
}) {
  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <button
          className="icon-button modal-close"
          onClick={onClose}
          aria-label="Close"
        >
          <X size={18} />
        </button>
        <div className="modal-icon">
          <CircleHelp size={22} />
        </div>
        <h2 id="modal-title">{title}</h2>
        {children}
      </section>
    </div>
  )
}

function LoginPanel({
  kind,
  active,
  onActivate,
  onLogin,
  onModal,
}: {
  kind: LoginKind
  active: boolean
  onActivate: () => void
  onLogin: (username: string, remember: boolean) => void
  onModal: (modal: "contact" | "help") => void
}) {
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [remember, setRemember] = useState(false)
  const ready = username.trim().length > 2 && password.length > 3

  function submit(event: FormEvent) {
    event.preventDefault()
    if (ready) onLogin(username, remember)
  }

  return (
    <section
      className={`login-panel ${active ? "active" : "inactive"}`}
      onMouseDown={onActivate}
    >
      <div className="login-content">
        <LoginIllustration kind={kind} />
        <h1>{kind === "student" ? "Student Login" : "Teacher Login"}</h1>
        <p className="register-copy">
          Not registered?{" "}
          <button className="text-link" onClick={() => onModal("contact")}>
            Contact the school office.
          </button>
        </p>
        <form onSubmit={submit} className="login-form">
          <label className="line-field">
            <span>Username or E-mail</span>
            <div>
              <UserRound size={16} />
              <input
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                placeholder={
                  kind === "student" ? "e.g. DEMO-1042" : "e.g. t.wafula"
                }
                autoComplete="username"
                onFocus={onActivate}
              />
            </div>
            {kind === "student" && (
              <small>Learners and parents: use the admission number</small>
            )}
          </label>
          <label className="line-field">
            <span>Password</span>
            <div>
              <LockKeyhole size={16} />
              <input
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                type={showPassword ? "text" : "password"}
                placeholder="Enter your password"
                autoComplete="current-password"
                onFocus={onActivate}
              />
              <button
                type="button"
                className="field-action"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </label>
          <div className="form-options">
            <label className="remember">
              <input
                type="checkbox"
                checked={remember}
                onChange={(event) => setRemember(event.target.checked)}
              />
              <span>Remember me</span>
            </label>
            <button
              type="button"
              className="muted-link"
              onClick={() => onModal("help")}
            >
              Forgot Password?
            </button>
          </div>
          <button
            type="submit"
            className="login-button"
            disabled={!active || !ready}
          >
            Login {ready && active ? <Check size={14} /> : null}
          </button>
          <div className="or">
            <span>or</span>
          </div>
          <div className="login-actions">
            <button
              type="button"
              className="help-pill"
              onClick={() => onModal("help")}
            >
              <CircleHelp size={18} /> Login help
            </button>
            <a className="contact-pill" href="tel:+254700123456">
              <Phone size={17} /> Call school
            </a>
          </div>
        </form>
      </div>
    </section>
  )
}

function Login({
  onEnter,
}: {
  onEnter: (portal: Portal, remember?: boolean) => void
}) {
  const [active, setActive] = useState<LoginKind>("student")
  const [modal, setModal] = useState<"contact" | "help" | null>(null)
  const school = useSchoolStore()
  return (
    <main className="login-page">
      <div className="mobile-switch" aria-label="Choose login type">
        <button
          className={active === "student" ? "selected" : ""}
          onClick={() => setActive("student")}
        >
          Student
        </button>
        <button
          className={active === "teacher" ? "selected" : ""}
          onClick={() => setActive("teacher")}
        >
          Teacher
        </button>
      </div>
      <LoginPanel
        kind="student"
        active={active === "student"}
        onActivate={() => setActive("student")}
        onLogin={(username, remember) => {
          const learner = school.learners.find(
            (item) =>
              item.admission.toLowerCase() === username.toLowerCase() &&
              item.status === "Active",
          )
          if (!learner) {
            setModal("help")
            return
          }
          setActiveLearner(learner.admission)
          onEnter("student", remember)
        }}
        onModal={setModal}
      />
      <LoginPanel
        kind="teacher"
        active={active === "teacher"}
        onActivate={() => setActive("teacher")}
        onLogin={(username, remember) =>
          onEnter(
            /admin|head|bursar|secretary/i.test(username) ? "admin" : "teacher",
            remember,
          )
        }
        onModal={setModal}
      />
      {modal === "contact" && (
        <Modal title="Contact the school office" onClose={() => setModal(null)}>
          <p>
            Accounts are created by the school to protect learner information.
          </p>
          <dl>
            <div>
              <dt>Telephone</dt>
              <dd>+254 700 123 456</dd>
            </div>
            <div>
              <dt>Email</dt>
              <dd>office@greenfield.ac.ke</dd>
            </div>
          </dl>
        </Modal>
      )}
      {modal === "help" && (
        <Modal title="Login help" onClose={() => setModal(null)}>
          <p>
            Learners and parents sign in with the learner admission number.
            Staff use their school username.
          </p>
          <p className="modal-note">
            For a password reset, contact the school office. A verification code
            will be sent to the phone number on record.
          </p>
        </Modal>
      )}
    </main>
  )
}

const parentNav = [
  ["Home", Home],
  ["Results", GraduationCap],
  ["Reports", FileText],
  ["Notices", Bell],
  ["Fees", WalletCards],
  ["More", Menu],
] as const

function AppShell({
  portal,
  onLogout,
}: {
  portal: "student" | "teacher" | "admin"
  onLogout: () => void
}) {
  const school = useSchoolStore()
  const learner = activeLearner(school)
  const [page, setPage] = useState(portal === "student" ? "Home" : "Dashboard")
  const nav =
    portal === "student"
      ? parentNav
      : portal === "teacher"
        ? [
            ["Dashboard", Home],
            ["Attendance", UsersRound],
            ["Results", GraduationCap],
            ["Class", BookOpen],
            ["Assignments", FileText],
            ["Notices", Bell],
            ["Timetable", CalendarDays],
          ] as const
        : Object.values(adminNavGroups)
            .flat()
            .map(
              (label) =>
                [label, label === "Dashboard" ? Home : FileText] as const,
            )

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="school-brand">
          <div className="crest">
            <BookOpen size={23} />
          </div>
          <div>
            <strong>{school.schoolName}</strong>
            <span>{school.motto}</span>
          </div>
        </div>
        <nav aria-label="Main navigation">
          <p>{portal === "admin" ? "SCHOOL ADMINISTRATION" : "PORTAL"}</p>
          {nav.map(([label, Icon]) => (
            <button
              key={label}
              className={
                page === label || (page === "Home" && label === "Dashboard")
                  ? "current"
                  : ""
              }
              onClick={() => setPage(label)}
            >
              <Icon size={18} />
              <span>{label}</span>
            </button>
          ))}
        </nav>
        <div className="sidebar-user">
          <div className="avatar">
            {portal === "student"
              ? (learner?.name
                  .split(" ")
                  .map((part) => part[0])
                  .join("") ?? "L")
              : portal === "teacher"
                ? "TW"
                : "JN"}
          </div>
          <div>
            <strong>
              {portal === "student"
                ? (learner?.name ?? "Learner")
                : portal === "teacher"
                  ? "Tracy Wafula"
                  : "Jane Njeri"}
            </strong>
            <span>
              {portal === "student"
                ? (learner?.grade ?? "No active class")
                : portal === "teacher"
                  ? "Class teacher · 5 East"
                  : "Super administrator"}
            </span>
          </div>
          <button onClick={onLogout} aria-label="Log out">
            <ChevronDown size={16} />
          </button>
        </div>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <div>
            <span className="eyebrow">
              {portal === "student"
                ? "LEARNER PORTAL"
                : portal === "teacher"
                  ? "TEACHER PORTAL"
                  : "ADMIN PORTAL"}
            </span>
            <h1>{page}</h1>
          </div>
          <div className="topbar-actions">
            <button className="term-select">
              Term 2, 2026 <ChevronDown size={15} />
            </button>
            <div className="sync">
              <Wifi size={15} />
              <span>
                <strong>Up to date</strong>
                <small>Synced 10:42</small>
              </span>
            </div>
            <button
              className="icon-button notification"
              aria-label="Notifications"
            >
              <Bell size={19} />
              <i />
            </button>
          </div>
        </header>
        <main className="portal-content">
          {portal === "student" ? (
            <>
              {page !== "More" && <StudentContent page={page} />}
              <StudentModule page={page} />
            </>
          ) : portal === "teacher" ? (
            <>
              {["Dashboard", "Attendance", "Results"].includes(page) && (
                <TeacherContent page={page} />
              )}
              {!["Dashboard", "Attendance", "Results"].includes(page) && (
                <TeacherModule page={page} />
              )}
            </>
          ) : (
            <AdminContent page={page} />
          )}
        </main>
        <nav className="bottom-nav" aria-label="Mobile navigation">
          {nav.slice(0, 5).map(([label, Icon]) => (
            <button
              key={label}
              className={
                page === label || (page === "Home" && label === "Dashboard")
                  ? "current"
                  : ""
              }
              onClick={() => setPage(label)}
            >
              <Icon size={20} />
              <span>{label}</span>
            </button>
          ))}
        </nav>
      </div>
    </div>
  )
}

function Metric({
  label,
  value,
  detail,
  tone,
}: {
  label: string
  value: string
  detail: string
  tone?: string
}) {
  return (
    <article className="metric">
      <span>{label}</span>
      <div>
        <strong className={tone}>{value}</strong>
        <small>{detail}</small>
      </div>
    </article>
  )
}

function ResultTable({ full = false }: { full?: boolean }) {
  const school = useSchoolStore()
  const learner = activeLearner(school)
  const rows = learnerResults(school, learner?.admission ?? "").slice(
    0,
    full ? undefined : 5,
  )
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Learning area</th>
            <th>Mid-term</th>
            <th>Term result</th>
            <th>Level</th>
            <th>Teacher&apos;s remark</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.area}>
              <td>
                <strong>{row.area}</strong>
              </td>
              <td className="number">
                {row.score === null ? "—" : `${Math.max(0, row.score - 3)}%`}
              </td>
              <td className="number">
                <strong>
                  {row.score === null ? "Pending" : `${row.score}%`}
                </strong>
              </td>
              <td>
                <span
                  className={`level level-${
                    row.level === "—" ? "pending" : row.level.toLowerCase()
                  }`}
                >
                  {row.level}
                </span>
              </td>
              <td>{row.remark}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

async function downloadReport(
  term: string,
  schoolName: string,
  reportRows: {
    area: string
    score: number | null
    level: string
    remark: string
  }[] = results,
  learner = {
    name: "Amani Mwangi",
    admission: "ADM-1042",
    grade: "Grade 5 East",
  },
) {
  const { jsPDF } = await import("jspdf")
  const doc = new jsPDF()
  doc.setFont("helvetica", "bold")
  doc.setFontSize(18)
  doc.text(schoolName.toUpperCase(), 105, 20, { align: "center" })
  doc.setFontSize(14)
  doc.text("Learner Progress Report", 105, 30, { align: "center" })
  doc.setFont("helvetica", "normal")
  doc.setFontSize(10)
  doc.text(
    `${learner.name}  |  ${learner.admission}  |  ${learner.grade}  |  ${term}`,
    20,
    43,
  )
  doc.line(20, 48, 190, 48)
  doc.setFont("helvetica", "bold")
  doc.text("Learning area", 20, 58)
  doc.text("Result", 120, 58)
  doc.text("Level", 150, 58)
  doc.setFont("helvetica", "normal")
  reportRows.forEach((row, index) => {
    const y = 68 + index * 10
    doc.text(row.area, 20, y)
    doc.text(row.score === null ? "Pending" : `${row.score}%`, 120, y)
    doc.text(row.level, 150, y)
  })
  doc.line(20, 124, 190, 124)
  doc.text("Attendance: 54 / 56 days", 20, 136)
  doc.text(
    "Class teacher: Amani applies learning confidently and consistently.",
    20,
    148,
  )
  doc.text("Verification: GF-2026-AM1042", 20, 274)
  doc.save(`${learner.name.replace(/ /g, "-")}-${term.replace(/ /g, "-")}.pdf`)
}

function StudentContent({ page }: { page: string }) {
  const school = useSchoolStore()
  const learner = activeLearner(school)
  const admission = learner?.admission ?? ""
  const ready = reportReady(school, admission)
  const currentResults = learnerResults(school, admission)
  const completedScores = currentResults
    .map((result) => result.score)
    .filter((score): score is number => score !== null)
  const overall = completedScores.length
    ? Math.round(
        completedScores.reduce((sum, score) => sum + score, 0) /
          completedScores.length,
      )
    : null
  const overallLevel =
    overall === null
      ? "—"
      : overall >= 75
        ? "EE"
        : overall >= 41
          ? "ME"
          : overall >= 21
            ? "AE"
            : "BE"
  if (page === "Results")
    return (
      <Page
        title="Term results"
        subtitle="Results are shown as entered and released by the school."
      >
        <div className="content-card">
          <div className="card-toolbar">
            <div>
              <h2>Academic performance</h2>
              <p>Term 2 · Grade 5 East</p>
            </div>
            <button className="secondary-button">
              <ArrowDownToLine size={16} /> Export
            </button>
          </div>
          <ResultTable full />
          <div className="level-key">
            <strong>Performance levels</strong>
            <span>
              <i className="ee" /> EE · Exceeding expectations
            </span>
            <span>
              <i className="me" /> ME · Meeting expectations
            </span>
            <span>
              <i className="ae" /> AE · Approaching expectations
            </span>
            <span>
              <i className="be" /> BE · Below expectations
            </span>
          </div>
        </div>
      </Page>
    )
  if (page === "Reports")
    return (
      <Page
        title="Report forms"
        subtitle="View and download released learner progress reports."
      >
        <div className="content-card report-list">
          <div className="report-icon">
            <FileText />
          </div>
          <div>
            <h2>Learner Progress Report</h2>
            <p>
              Term 2, 2026 ·{" "}
              {ready ? "Released 18 June 2026" : "Preparing automatically"}
            </p>
            <span className={ready ? "status-good" : "status-pending"}>
              <ShieldCheck size={14} />{" "}
              {ready ? "Complete" : "Waiting for marks"}
            </span>
          </div>
          <button className="secondary-button" onClick={() => window.print()}>
            <Eye size={16} /> Preview
          </button>
          <button
            className="primary-button"
            disabled={!ready}
            onClick={() =>
              downloadReport(
                "Term 2 2026",
                school.schoolName,
                currentResults,
                learner ?? undefined,
              )
            }
          >
            <Download size={16} /> Download PDF
          </button>
        </div>
        <div className="content-card report-list">
          <div className="report-icon muted">
            <FileText />
          </div>
          <div>
            <h2>Learner Progress Report</h2>
            <p>Term 1, 2026 · Released 04 April 2026</p>
            <span className="status-good">
              <ShieldCheck size={14} /> Complete
            </span>
          </div>
          <button
            className="secondary-button"
            onClick={() => downloadReport("Term 1 2026", school.schoolName)}
          >
            <Eye size={16} /> Preview
          </button>
          <button className="secondary-button">
            <Download size={16} /> Download PDF
          </button>
        </div>
      </Page>
    )
  if (page === "Notices")
    return (
      <Page
        title="School notices"
        subtitle="General and class-specific communication."
      >
        <div className="content-card">
          <div className="card-toolbar">
            <div className="search-box">
              <Search size={16} />
              <input placeholder="Search notices" />
            </div>
            <div className="segmented">
              <button className="selected">All</button>
              <button>General</button>
              <button>My class</button>
            </div>
          </div>
          <div className="notice-list">
            {notices.map((notice, index) => (
              <article key={notice.title}>
                <div className="notice-date">
                  {notice.date.split(" ").map((part) => (
                    <span key={part}>{part}</span>
                  ))}
                </div>
                <div>
                  <h3>
                    {notice.title}
                    {index === 0 && <i />}
                  </h3>
                  <p>{notice.body}</p>
                  <small>{index === 1 ? "Grade 5" : "All learners"}</small>
                </div>
              </article>
            ))}
          </div>
        </div>
      </Page>
    )
  if (page === "Fees")
    return (
      <Page
        title="Fees"
        subtitle="Invoice and payment information for the current term."
      >
        <section className="fee-hero">
          <div>
            <span>OUTSTANDING BALANCE</span>
            <strong>KES 12,450</strong>
            <small>As of 18 June 2026, 10:42</small>
          </div>
          <button className="primary-button">Pay with M-Pesa</button>
        </section>
        <div className="content-card">
          <div className="card-toolbar">
            <div>
              <h2>Term 2 invoice</h2>
              <p>Invoice GF-2026-2042</p>
            </div>
            <strong>KES 36,500</strong>
          </div>
          <div className="invoice-lines">
            <div>
              <span>Tuition</span>
              <strong>28,000</strong>
            </div>
            <div>
              <span>Lunch programme</span>
              <strong>6,000</strong>
            </div>
            <div>
              <span>Activities</span>
              <strong>2,500</strong>
            </div>
            <div className="total">
              <span>Total invoiced</span>
              <strong>KES 36,500</strong>
            </div>
          </div>
        </div>
      </Page>
    )
  return (
    <Page
      title="Learner overview"
      subtitle={`${learner?.name ?? "Learner"} · ${admission} · ${learner?.grade ?? "No class"}`}
    >
      <section className="metrics">
        <Metric
          label="OVERALL LEVEL"
          value={overallLevel}
          detail={
            overall === null
              ? "Results pending"
              : `${overall}% current term result`
          }
          tone="green"
        />
        <Metric
          label="ATTENDANCE"
          value="96.4%"
          detail="54 of 56 school days"
        />
        <Metric
          label="FEE BALANCE"
          value="KES 12,450"
          detail="Updated 18 June"
        />
      </section>
      <div className="dashboard-grid">
        <section className="content-card results-card">
          <div className="card-toolbar">
            <div>
              <h2>Latest results</h2>
              <p>Term 2, 2026</p>
            </div>
            <button className="text-action">View all</button>
          </div>
          <ResultTable />
        </section>
        <aside className="content-card notice-card">
          <div className="card-toolbar">
            <div>
              <h2>Notices</h2>
              <p>Latest school updates</p>
            </div>
            <button className="text-action">View all</button>
          </div>
          {notices.slice(0, 3).map((notice) => (
            <article key={notice.title}>
              <span>{notice.date}</span>
              <div>
                <h3>{notice.title}</h3>
                <p>{notice.body}</p>
              </div>
            </article>
          ))}
        </aside>
        <section className="content-card dates-card">
          <div className="card-toolbar">
            <div>
              <h2>Upcoming dates</h2>
              <p>Term calendar and assignments</p>
            </div>
          </div>
          <div>
            <CalendarDays size={18} />
            <span>
              <strong>20 June</strong>
              <small>Mid-term break begins</small>
            </span>
          </div>
          <div>
            <Clock3 size={18} />
            <span>
              <strong>24 June</strong>
              <small>Mathematics assignment due</small>
            </span>
          </div>
          <div>
            <BookOpen size={18} />
            <span>
              <strong>2 August</strong>
              <small>Term closes</small>
            </span>
          </div>
        </section>
      </div>
    </Page>
  )
}

function TeacherContent({ page }: { page: string }) {
  const school = useSchoolStore()
  const [selectedSubject, setSelectedSubject] = useState<string>("Mathematics")
  const activeLearners = school.learners.filter(
    (learner) => learner.status === "Active",
  )
  const entered = activeLearners.filter(
    (learner) =>
      typeof school.marks[learner.admission]?.[selectedSubject] === "number",
  )
  const mean = entered.length
    ? Math.round(
        entered.reduce(
          (sum, learner) =>
            sum + Number(school.marks[learner.admission][selectedSubject]),
          0,
        ) / entered.length,
      )
    : 0
  if (page === "Attendance")
    return (
      <Page
        title="Attendance register"
        subtitle="Grade 5 East · Wednesday, 18 June 2026"
      >
        <div className="content-card">
          <div className="card-toolbar">
            <div>
              <h2>32 learners</h2>
              <p>Present is selected by default</p>
            </div>
            <button className="primary-button">
              <Check size={16} /> Save register
            </button>
          </div>
          <div className="register">
            {[
              "Amani Mwangi",
              "Baraka Otieno",
              "Chebet Koech",
              "Dalia Hassan",
              "Eliud Kamau",
              "Faith Wanjiku",
            ].map((name, index) => (
              <div key={name}>
                <span className="avatar small">
                  {name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")}
                </span>
                <strong>{name}</strong>
                <div className="attendance-options">
                  <button className={index === 2 ? "" : "selected"}>
                    Present
                  </button>
                  <button className={index === 2 ? "absent" : ""}>
                    Absent
                  </button>
                  <button>Late</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Page>
    )
  if (page === "Results")
    return (
      <Page
        title="Results entry"
        subtitle={`Grade 5 East · ${selectedSubject} · Mid-term`}
      >
        <div className="entry-summary">
          <Metric
            label="LEARNERS"
            value={String(activeLearners.length)}
            detail="Active class enrolment"
          />
          <Metric
            label="ENTERED"
            value={String(entered.length)}
            detail={`${
              activeLearners.length
                ? Math.round((entered.length / activeLearners.length) * 100)
                : 0
            }% complete`}
            tone="green"
          />
          <Metric
            label="CLASS MEAN"
            value={`${mean}%`}
            detail="Meeting expectations"
          />
        </div>
        <div className="content-card">
          <div className="card-toolbar">
            <div>
              <label className="subject-picker">
                <span>Learning area</span>
                <select
                  value={selectedSubject}
                  onChange={(event) => setSelectedSubject(event.target.value)}
                >
                  {SUBJECTS.map((subject) => (
                    <option key={subject}>{subject}</option>
                  ))}
                </select>
              </label>
              <p>Maximum score: 100 · Changes save offline automatically</p>
            </div>
            <div className="autosave">
              <Check size={14} /> Draft saved
            </div>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Admission no.</th>
                  <th>Learner</th>
                  <th>Score / 100</th>
                  <th>Level</th>
                  <th>Remark</th>
                </tr>
              </thead>
              <tbody>
                {activeLearners.map((learner) => {
                  const score =
                    school.marks[learner.admission]?.[selectedSubject] ?? null
                  const level =
                    score === null
                      ? "—"
                      : score >= 75
                        ? "EE"
                        : score >= 41
                          ? "ME"
                          : score >= 21
                            ? "AE"
                            : "BE"
                  return (
                    <tr key={learner.admission}>
                      <td>{learner.admission}</td>
                      <td>
                        <strong>{learner.name}</strong>
                      </td>
                      <td>
                        <input
                          className="score-input"
                          type="number"
                          min="0"
                          max="100"
                          value={score ?? ""}
                          aria-label={`${selectedSubject} score for ${learner.name}`}
                          onChange={(event) => {
                            const next = event.target.value
                            schoolActions.updateMark(
                              learner.admission,
                              selectedSubject,
                              next === ""
                                ? null
                                : Math.max(0, Math.min(100, Number(next))),
                            )
                          }}
                        />
                      </td>
                      <td>
                        <span
                          className={`level level-${
                            level === "—" ? "pending" : level.toLowerCase()
                          }`}
                        >
                          {level}
                        </span>
                      </td>
                      <td>
                        {score === null
                          ? "Not assessed"
                          : score >= 75
                            ? "Exceeding expectations"
                            : score >= 41
                              ? "Meeting expectations"
                              : "Requires support"}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </Page>
    )
  return (
    <Page title="Teaching overview" subtitle="Wednesday, 18 June 2026">
      <section className="metrics teacher-metrics">
        <Metric
          label="TODAY'S LESSONS"
          value="5"
          detail="Next: Mathematics · 10:20"
        />
        <Metric
          label="ATTENDANCE"
          value="1 class"
          detail="Still to mark today"
          tone="amber"
        />
        <Metric
          label="RESULTS PROGRESS"
          value="91%"
          detail="Grade 5 Mathematics"
          tone="green"
        />
      </section>
      <div className="dashboard-grid teacher-grid">
        <section className="content-card">
          <div className="card-toolbar">
            <div>
              <h2>Today&apos;s timetable</h2>
              <p>5 lessons · 2 classes</p>
            </div>
            <button className="text-action">Full timetable</button>
          </div>
          <div className="lesson-list">
            {[
              ["08:00", "English", "Grade 5 East"],
              ["09:20", "Mathematics", "Grade 5 East"],
              ["11:00", "Mathematics", "Grade 5 West"],
              ["13:40", "Science & Technology", "Grade 5 East"],
            ].map(([time, subject, grade], i) => (
              <div key={time} className={i === 1 ? "next" : ""}>
                <time>{time}</time>
                <i />
                <span>
                  <strong>{subject}</strong>
                  <small>{grade}</small>
                </span>
                {i === 1 && <em>Next</em>}
              </div>
            ))}
          </div>
        </section>
        <aside className="content-card">
          <div className="card-toolbar">
            <div>
              <h2>Action required</h2>
              <p>Tasks for the current term</p>
            </div>
          </div>
          <div className="task-list">
            <article>
              <span className="task-icon warning">
                <UsersRound />
              </span>
              <div>
                <strong>Mark attendance</strong>
                <p>Grade 5 East · Today</p>
              </div>
              <button>Open</button>
            </article>
            <article>
              <span className="task-icon">
                <GraduationCap />
              </span>
              <div>
                <strong>Complete mid-term scores</strong>
                <p>3 learners remaining</p>
              </div>
              <button>Open</button>
            </article>
            <article>
              <span className="task-icon">
                <FileText />
              </span>
              <div>
                <strong>Class teacher comments</strong>
                <p>Grade 5 East · 19 incomplete</p>
              </div>
              <button>Open</button>
            </article>
          </div>
        </aside>
      </div>
    </Page>
  )
}

function Page({
  title,
  subtitle,
  children,
}: {
  title: string
  subtitle: string
  children: ReactNode
}) {
  return (
    <>
      <div className="page-heading">
        <div>
          <h2>{title}</h2>
          <p>{subtitle}</p>
        </div>
        <div className="online-badge">
          <span /> Online
        </div>
      </div>
      {children}
    </>
  )
}

export default function App() {
  const [portal, setPortal] = useState<Portal>(() => {
    const saved = localStorage.getItem("greenfield-session")
    return saved === "student" || saved === "teacher" || saved === "admin"
      ? saved
      : "login"
  })
  function enter(next: Portal, remember = false) {
    setPortal(next)
    if (remember && next !== "login")
      localStorage.setItem("greenfield-session", next)
  }
  function logout() {
    localStorage.removeItem("greenfield-session")
    setPortal("login")
  }
  return portal === "login" ? (
    <Login onEnter={enter} />
  ) : (
    <AppShell portal={portal} onLogout={logout} />
  )
}
