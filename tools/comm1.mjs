// Notices, school settings and the database tables for notices, timetable, events and assignments.
// Run from the project root: node tools/comm1.mjs
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

/* ---- website ---- */
if (fs.existsSync(path.join(process.cwd(), "src/App.tsx"))) {
  patch("src/api.ts", [], (text) =>
    text.includes("apiSaveGlobal")
      ? text
      : text + [
          "",
          "/** Reads a school-wide settings record. */",
          "export async function apiGlobal<T>(slug: string): Promise<T> {",
          "  return (await call(`/globals/${slug}`)) as T",
          "}",
          "",
          "export async function apiSaveGlobal(slug: string, data: Record<string, unknown>): Promise<void> {",
          "  await call(`/globals/${slug}`, { method: \"POST\", body: JSON.stringify(data) })",
          "}",
          "",
        ].join("\n"))

  patch("src/schoolStore.ts", [], (text) =>
    text.includes("hydrateSchool")
      ? text
      : text + [
          "",
          "/** Applies the school's saved name and motto (from School Settings). */",
          "export function hydrateSchool(settings: { schoolName?: string | null; motto?: string | null }) {",
          "  state = {",
          "    ...state,",
          "    schoolName: settings.schoolName || state.schoolName,",
          "    motto: settings.motto || state.motto,",
          "  }",
          "  listeners.forEach((listener) => listener())",
          "}",
          "",
        ].join("\n"))

  patch("src/resultsData.ts", [[
    "bands",
    'export const levelFor = (percent: number | null) =>\n  percent === null ? "—" : percent >= 75 ? "EE" : percent >= 41 ? "ME" : percent >= 21 ? "AE" : "BE"\n\nexport const remarkFor = (percent: number | null) =>\n  percent === null\n    ? "Pending"\n    : percent >= 75\n      ? "Exceeds expectations"\n      : percent >= 41\n        ? "Meets expectations"\n        : percent >= 21\n          ? "Approaches expectations"\n          : "Needs support"\n',
    'export type GradeBand = { label: string; minPercent: number; remark?: string | null }\n\nlet bands: GradeBand[] = [\n  { label: "EE", minPercent: 75, remark: "Exceeds expectations" },\n  { label: "ME", minPercent: 41, remark: "Meets expectations" },\n  { label: "AE", minPercent: 21, remark: "Approaches expectations" },\n  { label: "BE", minPercent: 0, remark: "Needs support" },\n]\n\n/** The school\'s grading levels (set from School Settings). */\nexport function setGradeBands(next: GradeBand[]) {\n  if (next.length) bands = [...next].sort((a, b) => b.minPercent - a.minPercent)\n}\n\nconst bandFor = (percent: number) => bands.find((band) => percent >= band.minPercent) ?? bands[bands.length - 1]\n\nexport const levelFor = (percent: number | null) => (percent === null ? "—" : bandFor(percent).label)\n\nexport const remarkFor = (percent: number | null) => (percent === null ? "Pending" : (bandFor(percent).remark ?? ""))\n',
    "setGradeBands",
  ]])

  patch("src/PortalModules.tsx", [
    ["import", 'import { GuardiansByClass, LearnersPage } from "./AdminFamilies"\n', 'import { GuardiansByClass, LearnersPage } from "./AdminFamilies"\nimport { NoticesManage } from "./Notices"\nimport { SettingsLive } from "./AdminSettings"\n', 'from "./AdminSettings"'],
    ["cases", '    case "Report forms":\n      return <ReportFormsLive />\n', '    case "Report forms":\n      return <ReportFormsLive />\n    case "Notices":\n      return <NoticesManage />\n    case "Settings":\n      return <SettingsLive />\n', "<SettingsLive />"],
  ])

  patch("src/TeacherLive.tsx", [
    ["import", 'import { Field, STATUS_LABELS, Table, todayLocal, useFind } from "./LiveShell"\n', 'import { Field, STATUS_LABELS, Table, todayLocal, useFind } from "./LiveShell"\nimport { NoticesManage } from "./Notices"\n', 'from "./Notices"'],
    ["case", '    case "Results":\n      return <TeacherResults />\n', '    case "Results":\n      return <TeacherResults />\n    case "Notices":\n      return <NoticesManage teacher />\n', "<NoticesManage teacher />"],
  ])

  patch("src/FamilyLive.tsx", [
    ["import", 'import { useSchoolStore } from "./schoolStore"\n', 'import { useSchoolStore } from "./schoolStore"\nimport { NoticesInbox } from "./Notices"\n', 'from "./Notices"'],
    ["page", "  else content = <ComingSoon page={page} />\n", '  else if (page === "Notices") content = <NoticesInbox key={child.id} />\n  else content = <ComingSoon page={page} />\n', "<NoticesInbox"],
  ])

  patch("src/App.tsx", [
    ["import", 'import { LiveTermBadge, LiveUserBadge } from "./LiveShell"\n', 'import { LiveTermBadge, LiveUserBadge } from "./LiveShell"\nimport { loadSchoolSettings } from "./settingsData"\n', "loadSchoolSettings"],
    ["effect", "  const [checking, setChecking] = useState(API_ENABLED)\n", "  const [checking, setChecking] = useState(API_ENABLED)\n  useEffect(() => {\n    if (API_ENABLED) void loadSchoolSettings()\n  }, [])\n", "void loadSchoolSettings()"],
  ])
}

/* ---- API ---- */
const cfg = path.join(process.cwd(), "payload/src/payload.config.ts")
if (fs.existsSync(cfg)) {
  patch("payload/src/payload.config.ts", [
    ["imports", "import { registerFamily } from './endpoints/registerFamily'\n",
      "import { registerFamily } from './endpoints/registerFamily'\nimport { Notices } from './collections/Notices'\nimport { NoticeReads } from './collections/NoticeReads'\nimport { Events } from './collections/Events'\nimport { TimetableSlots } from './collections/TimetableSlots'\nimport { Assignments } from './collections/Assignments'\nimport { AssignmentSubmissions } from './collections/AssignmentSubmissions'\nimport { SchoolSettings } from './globals/SchoolSettings'\n", "collections/Notices"],
    ["collections", "    Marks,\n  ],", "    Marks,\n    Notices,\n    NoticeReads,\n    Events,\n    TimetableSlots,\n    Assignments,\n    AssignmentSubmissions,\n  ],", "    NoticeReads,\n"],
    ["globals", "  endpoints: [familyLogin, registerFamily],\n", "  endpoints: [familyLogin, registerFamily],\n  globals: [SchoolSettings],\n", "globals: [SchoolSettings]"],
  ])
} else {
  console.log("payload/ not found, skipped the API side")
}
console.log("Done.")