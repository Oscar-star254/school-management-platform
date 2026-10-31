import { FormEvent, ReactNode, useEffect, useState } from "react"

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

import { AdminContent, StudentModule, TeacherModule, adminNavGroups } from "./PortalModules"

import {
  SUBJECTS,
  activeLearner,
  learnerResults,
  reportReady,
  schoolActions,
  setActiveLearner,
  useSchoolStore,
} from "./schoolStore"

import { API_ENABLED, apiLearners, apiLogin, apiLogout, apiMe, portalForRole } from "./api"

import { hydrateLearners } from "./schoolStore"

import { FamilyLive } from "./FamilyLive"

import { TeacherLive } from "./TeacherLive"

import { LiveTermBadge, LiveUserBadge } from "./LiveShell"

import { loadSchoolSettings } from "./settingsData"

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

const defaultVision =
  "To nurture confident, curious learners who are ready to shape a brighter future."

const defaultMission =
  "To provide a caring, playful learning environment where every child can learn, grow and thrive."

function readLoginStatement(key: string, fallback: string) {
  try {
    return localStorage.getItem(key) ?? fallback
  } catch {
    return fallback
  }
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
        <button className="icon-button modal-close" onClick={onClose} aria-label="Close">
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

  onLogin: (username: string, remember: boolean, password: string) => void

  onModal: (modal: "contact" | "help") => void
}) {
  const [username, setUsername] = useState("")

  const [password, setPassword] = useState("")

  const [showPassword, setShowPassword] = useState(false)

  const [remember, setRemember] = useState(false)

  const ready = username.trim().length > 2 && password.length > 3

  function submit(event: FormEvent) {
    event.preventDefault()

    if (ready) onLogin(username, remember, password)
  }

  return (
    <section className={`login-panel ${active ? "active" : "inactive"}`} onMouseDown={onActivate}>
      <div className="login-content">
        <h1>{kind === "student" ? "Student Login" : "Teacher & Admin Login"}</h1>
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
                  kind === "student" ? "Admission number or email" : "Your email address"
                }
                autoComplete="username"
                onFocus={onActivate}
              />
            </div>
            {kind === "student" && <small>Learners and parents: use the admission number</small>}
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
            <button type="button" className="muted-link" onClick={() => onModal("help")}>
              Forgot Password?
            </button>
          </div>
          <button type="submit" className="login-button" disabled={!active || !ready}>
            Login {ready && active ? <Check size={14} /> : null}
          </button>
          <div className="or">
            <span>or</span>
          </div>
          <div className="login-actions">
            <button type="button" className="help-pill" onClick={() => onModal("help")}>
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

function Login({ onEnter }: { onEnter: (portal: Portal, remember?: boolean) => void }) {
  const [active, setActive] = useState<LoginKind>("student")

  const [modal, setModal] = useState<"contact" | "help" | null>(null)

  const school = useSchoolStore()

  const [loginError, setLoginError] = useState("")
  const [vision, setVision] = useState(() => readLoginStatement("smartschool-login-vision", defaultVision))
  const [mission, setMission] = useState(() =>
    readLoginStatement("smartschool-login-mission", defaultMission),
  )

  function updateStatement(key: string, value: string, update: (value: string) => void) {
    update(value)
    try {
      localStorage.setItem(key, value)
    } catch {
      // Keep the text editable for this visit when browser storage is unavailable.
    }
  }

  async function apiSignIn(identifier: string, password: string, remember: boolean) {
    try {
      const user = await apiLogin(identifier.trim(), password)

      const next = portalForRole(user.role)

      if (!next) throw new Error("This account cannot use the school portal.")

      const learners = await apiLearners()

      hydrateLearners(learners)

      if (next === "student") {
        const first = learners.find((item) => item.status === "Active")

        if (first) setActiveLearner(first.admission)
      }

      onEnter(next, remember)
    } catch (error) {
      setLoginError(error instanceof Error ? error.message : "Sign in failed")

      setModal("help")
    }
  }

  return (
    <main className="login-page">
      <section
        className={`login-hero ${school.schoolPhotoUrl ? "has-school-photo" : ""}`}
        style={
          school.schoolPhotoUrl
            ? {
                backgroundImage: `linear-gradient(180deg, rgba(7, 42, 94, .08) 0%, rgba(7, 34, 79, .84) 76%), url("${school.schoolPhotoUrl}")`,
              }
            : undefined
        }
        aria-label="Smart Schools Kindergarten welcome"
      >
        <div className="login-brand">
          <div className="login-brand-mark">
            {school.schoolBadgeUrl ? (
              <img src={school.schoolBadgeUrl} alt="" />
            ) : (
              <BookOpen size={25} aria-hidden="true" />
            )}
          </div>
          <div>
            <strong>{school.schoolName || "Smart Schools Kindergarten"}</strong>
            <span>EARLY LEARNING · BRIGHT FUTURES</span>
          </div>
        </div>
        <div className="login-hero-copy">
          <span className="login-eyebrow">WELCOME TO OUR SCHOOL</span>
          <h1>Big beginnings start here.</h1>
          <p className="login-motto">Play, Learn and Grow.</p>
        </div>
        <div className="login-statements">
          <label>
            <span>Our vision</span>
            <textarea
              aria-label="Edit school vision"
              rows={4}
              value={vision}
              onChange={(event) =>
                updateStatement("smartschool-login-vision", event.target.value, setVision)
              }
            />
          </label>
          <label>
            <span>Our mission</span>
            <textarea
              aria-label="Edit school mission"
              rows={4}
              value={mission}
              onChange={(event) =>
                updateStatement("smartschool-login-mission", event.target.value, setMission)
              }
            />
          </label>
          <small>School statements are editable and saved on this device.</small>
        </div>
        <span className="login-hero-footer">A happy place to discover, create and belong.</span>
      </section>

      <section className="login-side" aria-label="Sign in to your school portal">
        <header className="login-side-heading">
          <span className="login-eyebrow">SMARTSCHOOL PORTAL</span>
          <h2>Sign in to continue</h2>
          <p>Choose your portal and enter your school account details.</p>
        </header>
        <div className="login-card">
          <div className="login-role-switch" role="group" aria-label="Choose login type">
            <button
              type="button"
              aria-pressed={active === "student"}
              className={active === "student" ? "selected" : ""}
              onClick={() => setActive("student")}
            >
              Student
            </button>
            <button
              type="button"
              aria-pressed={active === "teacher"}
              className={active === "teacher" ? "selected" : ""}
              onClick={() => setActive("teacher")}
            >
              Teacher / Admin
            </button>
          </div>
          <div className="login-forms">
            <LoginPanel
              kind="student"
              active={active === "student"}
              onActivate={() => setActive("student")}
              onLogin={(username, remember, password) => {
                if (API_ENABLED) return void apiSignIn(username, password, remember)

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
              onLogin={(username, remember, password) =>
                API_ENABLED
                  ? void apiSignIn(username, password, remember)
                  : onEnter(
                      /admin|head|bursar|secretary/i.test(username) ? "admin" : "teacher",
                      remember,
                    )
              }
              onModal={setModal}
            />
          </div>
        </div>
        <div className="login-contact">
          <span className="login-contact-icon">
            <Phone size={17} />
          </span>
          <span>
            <strong>Need help signing in?</strong>
            <small>Our administration team is ready to help.</small>
          </span>
          <button type="button" onClick={() => setModal("contact")}>
            Contact administration
          </button>
        </div>
      </section>
      {modal === "contact" && (
        <Modal title="Contact the school office" onClose={() => setModal(null)}>
          <p>Accounts are created by the school to protect learner information.</p>
          <dl>
            <div>
              <dt>Telephone</dt>
              <dd>+254 700 123 456</dd>
            </div>
            <div>
              <dt>Email</dt>
              <dd>office@smartschool.ac.ke</dd>
            </div>
          </dl>
        </Modal>
      )}
      {modal === "help" && (
        <Modal title="Login help" onClose={() => setModal(null)}>
          {loginError && <p className="modal-note">{loginError}</p>}
          <p>
            Learners and parents sign in with the learner admission number. Staff use their school
            username.
          </p>
          <p className="modal-note">
            For a password reset, contact the school office. A verification code will be sent to the
            phone number on record.
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

  ["Events", CalendarDays],

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
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false)
  const [expandedGroups, setExpandedGroups] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem("smartschool-admin-nav-groups")
      const groups: unknown = saved ? JSON.parse(saved) : null
      return Array.isArray(groups) && groups.every((group) => typeof group === "string")
        ? groups
        : ["People", "Academics"]
    } catch {
      return ["People", "Academics"]
    }
  })

  const nav =
    portal === "student"
      ? parentNav
      : portal === "teacher"
        ? ([
            ["Dashboard", Home],

            ["Attendance", UsersRound],

            ["Results", GraduationCap],

            ["Class", BookOpen],

            ["Assignments", FileText],

            ["Events", CalendarDays],

            ["Notices", Bell],

            ["Timetable", CalendarDays],
          ] as const)
        : []

  useEffect(() => {
    localStorage.setItem("smartschool-admin-nav-groups", JSON.stringify(expandedGroups))
  }, [expandedGroups])

  const navigate = (nextPage: string) => {
    setPage(nextPage)
    setMobileDrawerOpen(false)
  }

  return (
    <div className="app-shell">
      {mobileDrawerOpen && (
        <button
          className="sidebar-backdrop"
          aria-label="Close navigation"
          onClick={() => setMobileDrawerOpen(false)}
        />
      )}
      <aside className={`sidebar ${mobileDrawerOpen ? "mobile-open" : ""}`}>
        <div className="school-brand">
          <div className="crest">
            {school.schoolBadgeUrl ? (
              <img src={school.schoolBadgeUrl} alt={`${school.schoolName} badge`} />
            ) : (
              <BookOpen size={23} />
            )}
          </div>
          <div>
            <strong>{school.schoolName}</strong>
            <span>{school.motto}</span>
          </div>
        </div>
        <nav aria-label="Main navigation">
          <p>{portal === "admin" ? "SCHOOL ADMINISTRATION" : "PORTAL"}</p>
          {portal === "admin" ? (
            <>
              <button
                className={`sidebar-dashboard-link ${page === "Dashboard" ? "current" : ""}`}
                onClick={() => navigate("Dashboard")}
              >
                <Home size={18} />
                <span>Dashboard</span>
              </button>
              {Object.entries(adminNavGroups)
                .filter(([group]) => group !== "Overview")
                .map(([group, pages]) => {
                  const GroupIcon =
                    group === "People"
                      ? UsersRound
                      : group === "Academics"
                        ? GraduationCap
                        : group === "Finance"
                          ? WalletCards
                          : group === "Communication"
                            ? CalendarDays
                            : ShieldCheck
                  const expanded = expandedGroups.includes(group)
                  return (
                    <section className="sidebar-group" key={group}>
                      <button
                        className={`sidebar-group-toggle ${expanded ? "expanded" : ""}`}
                        aria-expanded={expanded}
                        onClick={() =>
                          setExpandedGroups((current) =>
                            current.includes(group)
                              ? current.filter((item) => item !== group)
                              : [...current, group],
                          )
                        }
                      >
                        <GroupIcon size={17} />
                        <span>{group}</span>
                        <ChevronDown size={15} className="sidebar-group-chevron" />
                      </button>
                      {expanded && (
                        <div className="sidebar-group-pages">
                          {pages.map((label) => (
                            <button
                              key={label}
                              className={page === label ? "current" : ""}
                              onClick={() => navigate(label)}
                            >
                              <span>{label}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </section>
                  )
                })}
            </>
          ) : (
            nav.map(([label, Icon]) => (
              <button
                key={label}
                className={
                  page === label || (page === "Home" && label === "Dashboard") ? "current" : ""
                }
                onClick={() => setPage(label)}
              >
                <Icon size={18} />
                <span>{label}</span>
              </button>
            ))
          )}
        </nav>
        <div className="sidebar-user">
          {API_ENABLED ? (
            <LiveUserBadge />
          ) : (
            <>
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
            </>
          )}
          <button onClick={onLogout} aria-label="Log out">
            <ChevronDown size={16} />
          </button>
        </div>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <div className="topbar-heading">
            {portal === "admin" && (
              <button
                className="mobile-nav-toggle"
                aria-label={mobileDrawerOpen ? "Close menu" : "Open menu"}
                aria-expanded={mobileDrawerOpen}
                onClick={() => setMobileDrawerOpen((open) => !open)}
              >
                {mobileDrawerOpen ? <X size={20} /> : <Menu size={20} />}
              </button>
            )}
            <div className="topbar-titles">
              <span className="eyebrow">
                {portal === "student"
                  ? "LEARNER PORTAL"
                  : portal === "teacher"
                    ? "TEACHER PORTAL"
                    : "ADMIN PORTAL"}
              </span>
              <h1>{page}</h1>
            </div>
          </div>
          <div className="topbar-actions">
            {API_ENABLED ? (
              <LiveTermBadge />
            ) : (
              <button className="term-select">
                Term 2, 2026 <ChevronDown size={15} />
              </button>
            )}
            <div className="sync">
              <Wifi size={15} />
              <span>
                <strong>Up to date</strong>
                <small>Synced 10:42</small>
              </span>
            </div>
            <button className="icon-button notification" aria-label="Notifications">
              <Bell size={19} />
              <i />
            </button>
          </div>
        </header>
        <main className="portal-content">
          {API_ENABLED ? (
            portal === "student" ? (
              <FamilyLive page={page} />
            ) : portal === "teacher" ? (
              <TeacherLive page={page} />
            ) : (
              <AdminContent page={page} onNavigate={navigate} />
            )
          ) : portal === "student" ? (
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
            <AdminContent page={page} onNavigate={navigate} />
          )}
        </main>
        {portal !== "admin" && (
          <nav className="bottom-nav" aria-label="Mobile navigation">
            {nav.slice(0, 5).map(([label, Icon]) => (
              <button
                key={label}
                className={
                  page === label || (page === "Home" && label === "Dashboard") ? "current" : ""
                }
                onClick={() => setPage(label)}
              >
                <Icon size={20} />
                <span>{label}</span>
              </button>
            ))}
          </nav>
        )}
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
                <strong>{row.score === null ? "Pending" : `${row.score}%`}</strong>
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
    ? Math.round(completedScores.reduce((sum, score) => sum + score, 0) / completedScores.length)
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
      <Page title="Report forms" subtitle="View and download released learner progress reports.">
        <div className="content-card report-list">
          <div className="report-icon">
            <FileText />
          </div>
          <div>
            <h2>Learner Progress Report</h2>
            <p>Term 2, 2026 · {ready ? "Released 18 June 2026" : "Preparing automatically"}</p>
            <span className={ready ? "status-good" : "status-pending"}>
              <ShieldCheck size={14} /> {ready ? "Complete" : "Waiting for marks"}
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
      <Page title="School notices" subtitle="General and class-specific communication.">
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
      <Page title="Fees" subtitle="Invoice and payment information for the current term.">
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
          detail={overall === null ? "Results pending" : `${overall}% current term result`}
          tone="green"
        />
        <Metric label="ATTENDANCE" value="96.4%" detail="54 of 56 school days" />
        <Metric label="FEE BALANCE" value="KES 12,450" detail="Updated 18 June" />
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

  const activeLearners = school.learners.filter((learner) => learner.status === "Active")

  const entered = activeLearners.filter(
    (learner) => typeof school.marks[learner.admission]?.[selectedSubject] === "number",
  )

  const mean = entered.length
    ? Math.round(
        entered.reduce(
          (sum, learner) => sum + Number(school.marks[learner.admission][selectedSubject]),

          0,
        ) / entered.length,
      )
    : 0

  if (page === "Attendance")
    return (
      <Page title="Attendance register" subtitle="Grade 5 East · Wednesday, 18 June 2026">
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
                  <button className={index === 2 ? "" : "selected"}>Present</button>
                  <button className={index === 2 ? "absent" : ""}>Absent</button>
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
      <Page title="Results entry" subtitle={`Grade 5 East · ${selectedSubject} · Mid-term`}>
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
              activeLearners.length ? Math.round((entered.length / activeLearners.length) * 100) : 0
            }% complete`}
            tone="green"
          />
          <Metric label="CLASS MEAN" value={`${mean}%`} detail="Meeting expectations" />
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
                  const score = school.marks[learner.admission]?.[selectedSubject] ?? null

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

                              next === "" ? null : Math.max(0, Math.min(100, Number(next))),
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
        <Metric label="TODAY'S LESSONS" value="5" detail="Next: Mathematics · 10:20" />
        <Metric label="ATTENDANCE" value="1 class" detail="Still to mark today" tone="amber" />
        <Metric label="RESULTS PROGRESS" value="91%" detail="Grade 5 Mathematics" tone="green" />
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
    if (API_ENABLED) return "login"

    const saved = localStorage.getItem("greenfield-session")

    return saved === "student" || saved === "teacher" || saved === "admin" ? saved : "login"
  })

  const [checking, setChecking] = useState(API_ENABLED)

  useEffect(() => {
    if (API_ENABLED) void loadSchoolSettings()
  }, [])

  useEffect(() => {
    if (!API_ENABLED) return

    const onExpired = () => {
      hydrateLearners([])

      setPortal("login")
    }

    window.addEventListener("school-session-expired", onExpired)

    return () => window.removeEventListener("school-session-expired", onExpired)
  }, [])

  useEffect(() => {
    if (!API_ENABLED) return

    let cancelled = false

    apiMe()
      .then(async (user) => {
        const next = user ? portalForRole(user.role) : null

        if (!next) return

        const learners = await apiLearners().catch(() => [])

        hydrateLearners(learners)

        if (next === "student") {
          const first = learners.find((item) => item.status === "Active")

          if (first) setActiveLearner(first.admission)
        }

        if (!cancelled) setPortal(next)
      })

      .finally(() => {
        if (!cancelled) setChecking(false)
      })

    return () => {
      cancelled = true
    }
  }, [])

  function enter(next: Portal, remember = false) {
    setPortal(next)

    if (!API_ENABLED && remember && next !== "login")
      localStorage.setItem("greenfield-session", next)
  }

  function logout() {
    if (API_ENABLED) {
      void apiLogout()

      hydrateLearners([])

      sessionStorage.removeItem("greenfield-active-learner")
    }

    localStorage.removeItem("greenfield-session")

    setPortal("login")
  }

  if (checking)
    return (
      <main className="app-bootstrap" aria-live="polite">
        <div className="app-bootstrap-card">
          <span className="app-bootstrap-mark" aria-hidden="true">
            S
          </span>
          <strong>Smartschool</strong>
          <span>Checking your school session…</span>
          <div className="app-bootstrap-progress" />
        </div>
      </main>
    )

  return portal === "login" ? (
    <Login onEnter={enter} />
  ) : (
    <AppShell portal={portal} onLogout={logout} />
  )
}
