// Family sign-in, registration with guardians, guardians by class. Run from the project root: node tools/drop2a.mjs
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
patch("src/api.ts", [[
  "login",
  '  const data = await call("/users/login", {\n    method: "POST",\n    body: JSON.stringify({ email, password }),\n  })\n',
  '  const byEmail = email.includes("@")\n  const data = await call(byEmail ? "/users/login" : "/family-login", {\n    method: "POST",\n    body: JSON.stringify(byEmail ? { email, password } : { identifier: email, password }),\n  })\n',
  "/family-login",
]], (text) =>
  text.includes("apiRegisterFamily")
    ? text
    : text + [
        "",
        "export type FamilyRegistration = {",
        "  firstName: string",
        "  lastName: string",
        "  dateOfBirth?: string",
        "  classId?: number",
        "  password?: string",
        "  createStudentLogin?: boolean",
        "  studentEmail?: string",
        "  guardians: { existingId?: number; name?: string; phone?: string; email?: string; relationship?: string }[]",
        "}",
        "",
        "/** Registers a learner and up to two guardians in one step. */",
        "export async function apiRegisterFamily(body: FamilyRegistration) {",
        "  const data = await call(\"/register-family\", { method: \"POST\", body: JSON.stringify(body) })",
        "  return data as { admissionNumber: string; studentId: number; accounts: { name: string; signIn: string }[] }",
        "}",
        "",
      ].join("\n"))

/* ---- website: admin menu pages ---- */
patch("src/PortalModules.tsx", [
  ["import", 'import { ReportFormsLive } from "./AdminReports"\n', 'import { ReportFormsLive } from "./AdminReports"\nimport { GuardiansByClass, LearnersPage } from "./AdminFamilies"\n', "AdminFamilies"],
  ["learners", '    case "Learners":\n      return <LearnersLive />\n', '    case "Learners":\n      return <LearnersPage />\n', "<LearnersPage />"],
  ["guardians", '    case "Guardians":\n      return <GuardiansLive />\n', '    case "Guardians":\n      return <GuardiansByClass />\n', "<GuardiansByClass />"],
])

/* ---- website: login hint ---- */
patch("src/App.tsx", [[
  "placeholder",
  'kind === "student" ? "e.g. DEMO-1042" : "e.g. t.wafula"',
  'kind === "student" ? "Admission number or email" : "Your email address"',
  "Admission number or email",
]])
}

/* ---- API: endpoints and the two-guardian limit ---- */
const cfg = path.join(process.cwd(), "payload/src/payload.config.ts")
if (fs.existsSync(cfg)) {
  patch("payload/src/payload.config.ts", [
    ["imports", "import { Marks } from './collections/Marks'\n",
      "import { Marks } from './collections/Marks'\nimport { familyLogin } from './endpoints/familyLogin'\nimport { registerFamily } from './endpoints/registerFamily'\n", "endpoints/familyLogin"],
    ["endpoints", "  plugins: [],\n", "  plugins: [],\n  endpoints: [familyLogin, registerFamily],\n", "endpoints: [familyLogin"],
  ])

  /* An allowed reader with nothing to see yet gets an empty list (not an error). */
  const NONE_DEF = "const NONE: Where = { id: { equals: 0 } }\n"
  patch("payload/src/access/people.ts", [
    ["none", "const scope = (where: Where): Where => where\n", "const scope = (where: Where): Where => where\n" + NONE_DEF, "const NONE: Where"],
    ["students teacher", "    return classIds.length ? scope({ currentClass: { in: classIds } }) : false\n", "    return classIds.length ? scope({ currentClass: { in: classIds } }) : NONE\n", ": NONE\n  }\n  if (hasRole(user, 'student'))"],
    ["students parent", "    return ids.length ? scope({ id: { in: ids } }) : false\n", "    return ids.length ? scope({ id: { in: ids } }) : NONE\n", "scope({ id: { in: ids } }) : NONE"],
    ["guardians teacher", "    return guardianIds.length ? scope({ id: { in: guardianIds } }) : false\n", "    return guardianIds.length ? scope({ id: { in: guardianIds } }) : NONE\n", "scope({ id: { in: guardianIds } }) : NONE"],
    ["links parent", "    return guardianIds.length ? { guardian: { in: guardianIds } } : false\n", "    return guardianIds.length ? scope({ guardian: { in: guardianIds } }) : NONE\n", "scope({ guardian: { in: guardianIds } }) : NONE"],
  ])
  patch("payload/src/access/academics.ts", [
    ["none", "const scope = (where: Where): Where => where\n", "const scope = (where: Where): Where => where\n" + NONE_DEF, "const NONE: Where"],
    ["attendance teacher",
      "export const attendanceRead: Access = async ({ req }) => {\n  const user = getUser(req)\n  if (!user) return false\n  if (hasRole(user, ...ACADEMIC_MANAGERS)) return true\n  if (hasRole(user, ...TEACHING_ROLES)) {\n    const classIds = await getTaughtClassIds(req, user)\n    return classIds.length ? scope({ class: { in: classIds } }) : false\n",
      "export const attendanceRead: Access = async ({ req }) => {\n  const user = getUser(req)\n  if (!user) return false\n  if (hasRole(user, ...ACADEMIC_MANAGERS)) return true\n  if (hasRole(user, ...TEACHING_ROLES)) {\n    const classIds = await getTaughtClassIds(req, user)\n    return classIds.length ? scope({ class: { in: classIds } }) : NONE\n", "attendanceRead: Access = async ({ req }) => {\n  const user = getUser(req)\n  if (!user) return false\n  if (hasRole(user, ...ACADEMIC_MANAGERS)) return true\n  if (hasRole(user, ...TEACHING_ROLES)) {\n    const classIds = await getTaughtClassIds(req, user)\n    return classIds.length ? scope({ class: { in: classIds } }) : NONE"],
    ["attendance family", "  return studentIds.length ? scope({ student: { in: studentIds } }) : false\n", "  return studentIds.length ? scope({ student: { in: studentIds } }) : NONE\n", "scope({ student: { in: studentIds } }) : NONE"],
    ["assessments", "    const ids = await getReadableAssessmentIds(req, user)\n    return ids.length ? scope({ id: { in: ids } }) : false\n  }\n  const ids = await getPublishedAssessmentIds(req, user)\n  return ids.length ? scope({ id: { in: ids } }) : false\n",
      "    const ids = await getReadableAssessmentIds(req, user)\n    return ids.length ? scope({ id: { in: ids } }) : NONE\n  }\n  const ids = await getPublishedAssessmentIds(req, user)\n  return ids.length ? scope({ id: { in: ids } }) : NONE\n", "getPublishedAssessmentIds(req, user)\n  return ids.length ? scope({ id: { in: ids } }) : NONE"],
    ["marks teacher", "    const ids = await getReadableAssessmentIds(req, user)\n    return ids.length ? scope({ assessment: { in: ids } }) : false\n", "    const ids = await getReadableAssessmentIds(req, user)\n    return ids.length ? scope({ assessment: { in: ids } }) : NONE\n", "scope({ assessment: { in: ids } }) : NONE"],
    ["marks family", "  if (!studentIds.length || !publishedIds.length) return false\n", "  if (!studentIds.length || !publishedIds.length) return NONE\n", "publishedIds.length) return NONE"],
  ])
  patch("payload/src/collections/GuardianLinks.ts", [[
    "max two",
    "          throw new APIError('This guardian is already linked to that student.', 400, null, true)\n        }\n        return data\n",
    "          throw new APIError('This guardian is already linked to that student.', 400, null, true)\n        }\n        const others: Record<string, unknown>[] = [{ student: { equals: relId(merged.student) } }]\n        if (originalDoc?.id) others.push({ id: { not_equals: originalDoc.id } })\n        const siblings = await req.payload.find({\n          collection: 'guardian-links',\n          where: { and: others } as never,\n          limit: 1,\n          depth: 0,\n          req,\n        })\n        if (siblings.totalDocs >= 2) {\n          throw new APIError('A learner can have at most two guardians.', 400, null, true)\n        }\n        return data\n",
    "at most two guardians",
  ]])
} else {
  console.log("payload/ not found, skipped the API side")
}
console.log("Done.")