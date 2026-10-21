// Connects the Vite web app and the Payload app. Run from the project root: node tools/connect.mjs
import fs from "node:fs"
import path from "node:path"

function patch(file, edits) {
  if (!fs.existsSync(file)) throw new Error("Missing file: " + file)
  const raw = fs.readFileSync(file, "utf8")
  const crlf = raw.includes("\r\n")
  let text = raw.replace(/\r\n/g, "\n")
  for (const [name, from, to, marker] of edits) {
    if (marker && text.includes(marker)) continue // already applied
    const count = text.split(from).length - 1
    if (count !== 1) throw new Error(file + ": anchor '" + name + "' found " + count + " times (expected 1)")
    text = text.replace(from, () => to)
  }
  fs.writeFileSync(file, crlf ? text.replace(/\n/g, "\r\n") : text)
  console.log("patched " + file)
}

const web = (p) => path.join(process.cwd(), p)

/* ---------------- web app ---------------- */
patch(web("src/schoolStore.ts"), [
  ["import", 'import { useSyncExternalStore } from "react"\n',
    'import { useSyncExternalStore } from "react"\nimport { API_ENABLED } from "./api"\n', "API_ENABLED"],
  ["storageKey", 'const storageKey = "greenfield-school-data-v1"\n',
    'const serverInitialState: SchoolState = { ...initialState, learners: [], marks: {} }\n\nfunction guardDemo() {\n  if (API_ENABLED)\n    throw new Error(\n      "This action is not connected to the school database yet. Please use the school admin panel.",\n    )\n}\n\nconst storageKey = "greenfield-school-data-v1"\n', "serverInitialState"],
  ["load", "function load(): SchoolState {\n  try {\n",
    "function load(): SchoolState {\n  if (API_ENABLED) return serverInitialState\n  try {\n", "if (API_ENABLED) return serverInitialState"],
  ["save", "  localStorage.setItem(storageKey, JSON.stringify(state))\n",
    "  if (!API_ENABLED) localStorage.setItem(storageKey, JSON.stringify(state))\n", "if (!API_ENABLED) localStorage"],
  ["updateMark", "  updateMark(admission: string, subject: string, mark: number | null) {\n",
    "  updateMark(admission: string, subject: string, mark: number | null) {\n    guardDemo()\n", "updateMark(admission: string, subject: string, mark: number | null) {\n    guardDemo()"],
  ["addLearner", "  addLearner(learner: Learner) {\n",
    "  addLearner(learner: Learner) {\n    guardDemo()\n", "addLearner(learner: Learner) {\n    guardDemo()"],
  ["updateLearner", "  updateLearner(admission: string, changes: Partial<Learner>) {\n",
    "  updateLearner(admission: string, changes: Partial<Learner>) {\n    guardDemo()\n", "updateLearner(admission: string, changes: Partial<Learner>) {\n    guardDemo()"],
  ["updateSchool", '  updateSchool(settings: Pick<SchoolState, "schoolName" | "motto">) {\n',
    '  updateSchool(settings: Pick<SchoolState, "schoolName" | "motto">) {\n    guardDemo()\n', 'motto">) {\n    guardDemo()'],
  ["resetDemo", "  resetDemo() {\n", "  resetDemo() {\n    guardDemo()\n", "resetDemo() {\n    guardDemo()"],
])
fs.appendFileSync(web("src/schoolStore.ts"), fs.readFileSync(web("src/schoolStore.ts"), "utf8").includes("hydrateLearners") ? "" :
  "\n/** Replaces the learner list with data from the school server (not saved in the browser). */\nexport function hydrateLearners(learners: Learner[]) {\n  const empty = Object.fromEntries(SUBJECTS.map((subject) => [subject, null]))\n  state = {\n    ...state,\n    learners,\n    marks: Object.fromEntries(\n      learners.map((learner) => [learner.admission, state.marks[learner.admission] ?? empty]),\n    ),\n  }\n  listeners.forEach((listener) => listener())\n}\n")

patch(web("src/App.tsx"), [
  ["react import", 'import { FormEvent, ReactNode, useState } from "react"', 'import { FormEvent, ReactNode, useEffect, useState } from "react"', "useEffect, useState }"],
  ["api import", 'type LoginKind = "student" | "teacher"\n',
    'import {\n  API_ENABLED,\n  apiLearners,\n  apiLogin,\n  apiLogout,\n  apiMe,\n  portalForRole,\n} from "./api"\nimport { hydrateLearners } from "./schoolStore"\n\ntype LoginKind = "student" | "teacher"\n', "apiLearners,"],
  ["panel type", "onLogin: (username: string, remember: boolean) => void", "onLogin: (username: string, remember: boolean, password: string) => void", "remember: boolean, password: string"],
  ["panel call", "if (ready) onLogin(username, remember)", "if (ready) onLogin(username, remember, password)", "onLogin(username, remember, password)"],
  ["login state", '  const school = useSchoolStore()\n  return (\n    <main className="login-page">',
    '  const school = useSchoolStore()\n  const [loginError, setLoginError] = useState("")\n  async function apiSignIn(identifier: string, password: string, remember: boolean) {\n    try {\n      const user = await apiLogin(identifier.trim(), password)\n      const next = portalForRole(user.role)\n      if (!next) throw new Error("This account cannot use the school portal.")\n      const learners = await apiLearners()\n      hydrateLearners(learners)\n      if (next === "student") {\n        const first = learners.find((item) => item.status === "Active")\n        if (first) setActiveLearner(first.admission)\n      }\n      onEnter(next, remember)\n    } catch (error) {\n      setLoginError(error instanceof Error ? error.message : "Sign in failed")\n      setModal("help")\n    }\n  }\n  return (\n    <main className="login-page">', "async function apiSignIn"],
  ["student login", "        onLogin={(username, remember) => {\n          const learner = school.learners.find(",
    "        onLogin={(username, remember, password) => {\n          if (API_ENABLED) return void apiSignIn(username, password, remember)\n          const learner = school.learners.find(", "return void apiSignIn(username, password, remember)\n          const learner"],
  ["teacher login", '        onLogin={(username, remember) =>\n          onEnter(\n            /admin|head|bursar|secretary/i.test(username) ? "admin" : "teacher",\n            remember,\n          )\n        }',
    '        onLogin={(username, remember, password) =>\n          API_ENABLED\n            ? void apiSignIn(username, password, remember)\n            : onEnter(\n                /admin|head|bursar|secretary/i.test(username)\n                  ? "admin"\n                  : "teacher",\n                remember,\n              )\n        }', "? void apiSignIn(username, password, remember)\n            : onEnter("],
  ["help modal", '<Modal title="Login help" onClose={() => setModal(null)}>',
    '<Modal title="Login help" onClose={() => setModal(null)}>\n          {loginError && <p className="modal-note">{loginError}</p>}', "{loginError &&"],
  ["session init", '  const [portal, setPortal] = useState<Portal>(() => {\n    const saved = localStorage.getItem("greenfield-session")',
    '  const [portal, setPortal] = useState<Portal>(() => {\n    if (API_ENABLED) return "login"\n    const saved = localStorage.getItem("greenfield-session")', 'if (API_ENABLED) return "login"'],
  ["session effect", '  function enter(next: Portal, remember = false) {\n    setPortal(next)\n    if (remember && next !== "login")',
    '  const [checking, setChecking] = useState(API_ENABLED)\n  useEffect(() => {\n    if (!API_ENABLED) return\n    let cancelled = false\n    apiMe()\n      .then(async (user) => {\n        const next = user ? portalForRole(user.role) : null\n        if (!next) return\n        const learners = await apiLearners().catch(() => [])\n        hydrateLearners(learners)\n        if (next === "student") {\n          const first = learners.find((item) => item.status === "Active")\n          if (first) setActiveLearner(first.admission)\n        }\n        if (!cancelled) setPortal(next)\n      })\n      .finally(() => {\n        if (!cancelled) setChecking(false)\n      })\n    return () => {\n      cancelled = true\n    }\n  }, [])\n  function enter(next: Portal, remember = false) {\n    setPortal(next)\n    if (!API_ENABLED && remember && next !== "login")', "const [checking, setChecking]"],
  ["logout", '  function logout() {\n    localStorage.removeItem("greenfield-session")\n',
    '  function logout() {\n    if (API_ENABLED) {\n      void apiLogout()\n      hydrateLearners([])\n      sessionStorage.removeItem("greenfield-active-learner")\n    }\n    localStorage.removeItem("greenfield-session")\n', "void apiLogout()"],
  ["render", '  return portal === "login" ? (\n    <Login onEnter={enter} />',
    '  if (checking) return null\n  return portal === "login" ? (\n    <Login onEnter={enter} />', "if (checking) return null"],
])

patch(web("vite.config.ts"), [
  ["proxy", "      strictPort: true,\n",
    "      strictPort: true,\n      // Send /api calls to the Payload server so login cookies stay same-origin.\n      proxy: { '/api': { target: process.env.VITE_DEV_API ?? 'http://localhost:3000' } },\n", "VITE_DEV_API"],
])

/* ---------------- payload app ---------------- */
const pl = (p) => path.join(process.cwd(), "payload", p)
if (fs.existsSync(pl("src/payload.config.ts"))) {
  patch(pl("src/payload.config.ts"), [
    ["origins", "export default buildConfig({\n",
      "// Addresses allowed to send logged-in (cookie) requests: the API itself and the website.\nconst origins = [\n  process.env.PAYLOAD_PUBLIC_URL ?? 'http://localhost:3000',\n  ...(process.env.WEB_ORIGINS ?? 'http://localhost:8443').split(',').map((o) => o.trim()),\n].filter(Boolean)\n\nexport default buildConfig({\n", "const origins"],
    ["csrf", "  secret: process.env.PAYLOAD_SECRET || '',\n",
      "  secret: process.env.PAYLOAD_SECRET || '',\n  cors: origins,\n  csrf: origins,\n", "csrf: origins"],
  ])
  patch(pl("src/collections/Users.ts"), [
    ["cookies", "    lockTime: 10 * 60 * 1000, // 10 minutes\n  },\n",
      "    lockTime: 10 * 60 * 1000, // 10 minutes\n    cookies: {\n      secure: process.env.NODE_ENV === 'production',\n      sameSite: 'Lax',\n    },\n  },\n", "cookies: {"],
  ])
  const pkgFile = pl("package.json")
  const pkg = JSON.parse(fs.readFileSync(pkgFile, "utf8"))
  pkg.scripts["vercel-build"] = "pnpm payload migrate && pnpm build"
  fs.writeFileSync(pkgFile, JSON.stringify(pkg, null, 2) + "\n")
  console.log("patched " + pkgFile)
  fs.writeFileSync(pl(".env.example"),
    "# Copy to .env and fill in. Never commit .env.\nDATABASE_URL=postgres://user:password@host:5432/dbname\nPAYLOAD_SECRET=generate-a-long-random-string\n# This API's own public address\nPAYLOAD_PUBLIC_URL=http://localhost:3000\n# Comma-separated website addresses allowed to log in through the API\nWEB_ORIGINS=http://localhost:8443\n")
  console.log("wrote payload/.env.example")
} else {
  console.log("payload/ folder not found, skipped the API side")
}
console.log("Done.")