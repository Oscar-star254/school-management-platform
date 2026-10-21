// Drop 1a: teacher portal, results monitor, live shell. Run from the project root: node tools/drop1a.mjs
import fs from "node:fs"
import path from "node:path"

function patch(rel, edits, after) {
  const file = path.join(process.cwd(), rel)
  if (!fs.existsSync(file)) throw new Error("Missing file: " + rel)
  const raw = fs.readFileSync(file, "utf8")
  const crlf = raw.includes("\r\n")
  let text = raw.replace(/\r\n/g, "\n")
  for (const [name, from, to, marker] of edits) {
    if (text.includes(marker)) continue
    const count = text.split(from).length - 1
    if (count !== 1) throw new Error(rel + ": anchor '" + name + "' found " + count + " times (expected 1)")
    text = text.replace(from, () => to)
  }
  if (after) text = after(text)
  fs.writeFileSync(file, crlf ? text.replace(/\n/g, "\r\n") : text)
  console.log("patched " + rel)
}

/* ---- api.ts: remember who is signed in ---- */
patch("src/api.ts", [
  ["login", "  return data.user as ApiUser\n}", "  currentUser = data.user as ApiUser\n  return currentUser\n}", "currentUser = data.user"],
  ["me", "    return (data.user as ApiUser | null) ?? null\n", "    currentUser = (data.user as ApiUser | null) ?? null\n    return currentUser\n", "currentUser = (data.user"],
  ["logout", '    await call("/users/logout", { method: "POST" })\n', '    await call("/users/logout", { method: "POST" })\n    currentUser = null\n', "currentUser = null"],
], (text) =>
  text.includes("export const getCurrentUser")
    ? text
    : text + "\nlet currentUser: ApiUser | null = null\nexport const getCurrentUser = () => currentUser\n")

/* ---- PortalModules.tsx: results monitor page ---- */
patch("src/PortalModules.tsx", [
  ["import", 'import { LearningAreasLive, TermsClassesLive } from "./AdminAcademics"\n',
    'import { LearningAreasLive, TermsClassesLive } from "./AdminAcademics"\nimport { ResultsMonitorLive } from "./AdminResults"\n', "AdminResults"],
  ["case", '    case "Learning areas":\n      return <LearningAreasLive />\n',
    '    case "Learning areas":\n      return <LearningAreasLive />\n    case "Results monitor":\n      return <ResultsMonitorLive />\n', "ResultsMonitorLive />"],
])

/* ---- App.tsx: live portals, live user badge, live term ---- */
patch("src/App.tsx", [
  ["imports", 'import { hydrateLearners } from "./schoolStore"\n',
    'import { hydrateLearners } from "./schoolStore"\nimport { FamilyLive } from "./FamilyLive"\nimport { TeacherLive } from "./TeacherLive"\nimport { LiveTermBadge, LiveUserBadge } from "./LiveShell"\n', "LiveUserBadge"],
  ["main", '        <main className="portal-content">\n          {portal === "student" ? (\n',
    '        <main className="portal-content">\n          {API_ENABLED ? (\n            portal === "student" ? (\n              <FamilyLive page={page} />\n            ) : portal === "teacher" ? (\n              <TeacherLive page={page} />\n            ) : (\n              <AdminContent page={page} />\n            )\n          ) : portal === "student" ? (\n', "<FamilyLive page={page} />"],
  ["term", '            <button className="term-select">\n              Term 2, 2026 <ChevronDown size={15} />\n            </button>\n',
    '            {API_ENABLED ? (\n              <LiveTermBadge />\n            ) : (\n              <button className="term-select">\n                Term 2, 2026 <ChevronDown size={15} />\n              </button>\n            )}\n', "<LiveTermBadge />"],
], (text) => {
  if (text.includes("<LiveUserBadge />")) return text
  const start = text.indexOf('          <div className="avatar">')
  const end = text.indexOf('          <button onClick={onLogout} aria-label="Log out">')
  if (start < 0 || end < 0 || end < start) throw new Error("src/App.tsx: could not find the sidebar user block")
  const original = text.slice(start, end)
  return text.slice(0, start) + "          {API_ENABLED ? (\n            <LiveUserBadge />\n          ) : (\n            <>\n" + original + "            </>\n          )}\n" + text.slice(end)
})

/* ---- Payload: register the new collections ---- */
const cfg = path.join(process.cwd(), "payload/src/payload.config.ts")
if (fs.existsSync(cfg)) {
  patch("payload/src/payload.config.ts", [
    ["imports", "import { AuditLogs } from './collections/AuditLogs'\n",
      "import { AuditLogs } from './collections/AuditLogs'\nimport { Attendance } from './collections/Attendance'\nimport { Assessments } from './collections/Assessments'\nimport { Marks } from './collections/Marks'\n", "collections/Attendance"],
    ["list", "    AuditLogs,\n  ],", "    AuditLogs,\n    Attendance,\n    Assessments,\n    Marks,\n  ],", "    Attendance,\n"],
  ])
} else {
  console.log("payload/ not found, skipped the API side")
}
console.log("Done.")