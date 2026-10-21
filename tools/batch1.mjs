// Batch 1: real admin pages. Run from the project root: node tools/batch1.mjs
import fs from "node:fs"
import path from "node:path"

const file = path.join(process.cwd(), "src/PortalModules.tsx")
const raw = fs.readFileSync(file, "utf8")
const crlf = raw.includes("\r\n")
let text = raw.replace(/\r\n/g, "\n")

function edit(name, from, to, marker) {
  if (text.includes(marker)) return
  const count = text.split(from).length - 1
  if (count !== 1) throw new Error("anchor '" + name + "' found " + count + " times (expected 1)")
  text = text.replace(from, () => to)
}

edit("imports",
  'import { LearnerStatus, schoolActions, useSchoolStore } from "./schoolStore"\n',
  'import { LearnerStatus, schoolActions, useSchoolStore } from "./schoolStore"\nimport { API_ENABLED } from "./api"\nimport {\n  AuditLive,\n  ComingSoon,\n  DashboardLive,\n  GuardiansLive,\n  LearnersLive,\n  StaffLive,\n  UsersRolesLive,\n} from "./AdminPeople"\n',
  'from "./AdminPeople"')

edit("admin content",
  'export function AdminContent({ page }: { page: string }) {\n  const school = useSchoolStore()\n  const title = page === "Dashboard" ? "School overview" : page\n',
  'export function AdminContent({ page }: { page: string }) {\n  if (!API_ENABLED) return <AdminContentDemo page={page} />\n  switch (page) {\n    case "Dashboard":\n      return <DashboardLive />\n    case "Learners":\n      return <LearnersLive />\n    case "Guardians":\n      return <GuardiansLive />\n    case "Staff":\n      return <StaffLive />\n    case "Users & roles":\n      return <UsersRolesLive />\n    case "Audit log":\n      return <AuditLive />\n    default:\n      return <ComingSoon page={page} />\n  }\n}\n\nfunction AdminContentDemo({ page }: { page: string }) {\n  const school = useSchoolStore()\n  const title = page === "Dashboard" ? "School overview" : page\n',
  "AdminContentDemo")

fs.writeFileSync(file, crlf ? text.replace(/\n/g, "\r\n") : text)
console.log("patched src/PortalModules.tsx")
console.log("Done.")