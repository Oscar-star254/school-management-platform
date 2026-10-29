// Makes School Settings take effect everywhere. Run from the project root: node tools/branding1.mjs
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

/* The store starts blank (no demo school name) and accepts an empty motto. */
patch("src/schoolStore.ts", [
  ["blank start", "const serverInitialState: SchoolState = { ...initialState, learners: [], marks: {} }", 'const serverInitialState: SchoolState = { ...initialState, learners: [], marks: {}, schoolName: "", motto: "" }', 'schoolName: "", motto: "" }'],
  ["motto", "    motto: settings.motto || state.motto,\n", '    motto: settings.motto ?? "",\n', 'settings.motto ?? ""'],
])

/* Report forms print the head teacher, contact line and footer from Settings. */
patch("src/resultsData.ts", [
  ["profile", "export async function downloadLiveReport(options: {",
    'export type ReportProfile = { principalName?: string | null; reportFooter?: string | null; phone?: string | null; email?: string | null; address?: string | null }\nlet profile: ReportProfile = {}\n\n/** Details from School Settings that are printed on every report form. */\nexport function setReportProfile(next: ReportProfile) {\n  profile = next\n}\n\nexport async function downloadLiveReport(options: {',
    "setReportProfile"],
  ["contact", '  doc.setFontSize(14)\n  doc.text("Learner Progress Report", 105, 30, { align: "center" })\n',
    '  const contact = [profile.address?.replace(/\\s*\\n\\s*/g, ", "), profile.phone, profile.email].filter(Boolean).join("  |  ")\n  if (contact) {\n    doc.setFontSize(8)\n    doc.setFont("helvetica", "normal")\n    doc.text(contact, 105, 25, { align: "center" })\n    doc.setFont("helvetica", "bold")\n  }\n  doc.setFontSize(14)\n  doc.text("Learner Progress Report", 105, 30, { align: "center" })\n',
    "const contact ="],
  ["footer", '  doc.text(`Issued ${new Date().toLocaleDateString("en-KE")} from the school system.`, 20, 274)\n',
    '  doc.setFontSize(10)\n  if (profile.principalName) doc.text(`Head teacher: ${profile.principalName}`, 20, 252)\n  if (profile.reportFooter) doc.text(doc.splitTextToSize(profile.reportFooter, 170), 20, 262)\n  doc.text(`Issued ${new Date().toLocaleDateString("en-KE")} from the school system.`, 20, 282)\n',
    "Head teacher:"],
])

/* Saved settings reach the report profile and the browser tab title. */
patch("src/settingsData.ts", [
  ["import", 'import { setGradeBands } from "./resultsData"\n', 'import { setGradeBands, setReportProfile } from "./resultsData"\n', "setReportProfile"],
  ["apply", "  hydrateSchool({ schoolName: settings.schoolName, motto: settings.motto })\n",
    "  hydrateSchool({ schoolName: settings.schoolName, motto: settings.motto })\n  if (settings.schoolName) document.title = settings.schoolName\n  setReportProfile({\n    principalName: settings.principalName,\n    reportFooter: settings.reportFooter,\n    phone: settings.phone,\n    email: settings.email,\n    address: settings.address,\n  })\n",
    "document.title"],
])

/* The sign-in page shows the school's name. */
patch("src/App.tsx", [
  ["name hook", '  return (\n    <section\n      className={`login-panel ${active ? "active" : "inactive"}`}\n',
    '  const { schoolName } = useSchoolStore()\n  return (\n    <section\n      className={`login-panel ${active ? "active" : "inactive"}`}\n', "const { schoolName } = useSchoolStore()"],
  ["name show", '        <h1>{kind === "student" ? "Student Login" : "Teacher Login"}</h1>\n',
    '        {API_ENABLED && schoolName && (\n          <p className="register-copy">\n            <strong>{schoolName}</strong>\n          </p>\n        )}\n        <h1>{kind === "student" ? "Student Login" : "Teacher Login"}</h1>\n', "{API_ENABLED && schoolName && ("],
])
console.log("Done.")