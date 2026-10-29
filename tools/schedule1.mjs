// Timetable, assignments and the family "More" pages. Run from the project root: node tools/schedule1.mjs
import fs from "node:fs"
import path from "node:path"

function patch(rel, edits) {
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
  fs.writeFileSync(file, crlf ? text.replace(/\n/g, "\r\n") : text)
  console.log("patched " + rel)
}

patch("src/PortalModules.tsx", [
  ["import", 'import { SettingsLive } from "./AdminSettings"\n', 'import { SettingsLive } from "./AdminSettings"\nimport { TimetableAdmin } from "./Timetable"\n', 'from "./Timetable"'],
  ["case", '    case "Settings":\n      return <SettingsLive />\n', '    case "Settings":\n      return <SettingsLive />\n    case "Timetable":\n      return <TimetableAdmin />\n', "<TimetableAdmin />"],
])

patch("src/TeacherLive.tsx", [
  ["import", 'import { NoticesManage } from "./Notices"\n', 'import { NoticesManage } from "./Notices"\nimport { TeacherAssignments } from "./AssignmentsLive"\nimport { TimetableView } from "./Timetable"\n', 'from "./AssignmentsLive"'],
  ["cases", '    case "Notices":\n      return <NoticesManage teacher />\n', '    case "Notices":\n      return <NoticesManage teacher />\n    case "Assignments":\n      return <TeacherAssignments />\n    case "Timetable":\n      return <TimetableView showClass />\n', "<TeacherAssignments />"],
])

patch("src/FamilyLive.tsx", [
  ["import", 'import { NoticesInbox } from "./Notices"\n', 'import { NoticesInbox } from "./Notices"\nimport { FamilyMore } from "./FamilyMore"\n', 'from "./FamilyMore"'],
  ["page", '  else if (page === "Notices") content = <NoticesInbox key={child.id} />\n', '  else if (page === "Notices") content = <NoticesInbox key={child.id} />\n  else if (page === "More") content = <FamilyMore key={child.id} child={child} />\n', "<FamilyMore"],
])
console.log("Done.")