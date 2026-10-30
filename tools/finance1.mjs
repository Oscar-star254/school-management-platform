// Fees: fee structures, invoices, payments, receipts, reconciliation, family fee statement.
// Run from the project root: node tools/finance1.mjs
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

if (fs.existsSync(path.join(process.cwd(), "src/App.tsx"))) {
  patch("src/api.ts", [], (text) =>
    text.includes("apiGenerateInvoices")
      ? text
      : text + [
          "",
          "/** Creates an invoice for every active learner in a fee structure's class. Safe to run twice. */",
          "export async function apiGenerateInvoices(structureId: number) {",
          "  const data = await call(\"/generate-invoices\", { method: \"POST\", body: JSON.stringify({ structureId }) })",
          "  return data as { created: number; skipped: number }",
          "}",
          "",
        ].join("\n"))

  patch("src/resultsData.ts", [[
    "getter",
    "export function setReportProfile(next: ReportProfile) {\n  profile = next\n}\n",
    "export function setReportProfile(next: ReportProfile) {\n  profile = next\n}\n\nexport const getReportProfile = () => profile\n",
    "getReportProfile",
  ]])

  patch("src/PortalModules.tsx", [
    ["import", 'import { TimetableAdmin } from "./Timetable"\n', 'import { TimetableAdmin } from "./Timetable"\nimport { FeeStructuresLive, InvoicesLive, PaymentsLive, ReconciliationLive } from "./Finance"\n', 'from "./Finance"'],
    ["cases", '    case "Timetable":\n      return <TimetableAdmin />\n', '    case "Timetable":\n      return <TimetableAdmin />\n    case "Fee structures":\n      return <FeeStructuresLive />\n    case "Invoices":\n      return <InvoicesLive />\n    case "Payments":\n      return <PaymentsLive />\n    case "Reconciliation":\n      return <ReconciliationLive />\n', "<FeeStructuresLive />"],
  ])

  patch("src/FamilyLive.tsx", [
    ["import", 'import { FamilyMore } from "./FamilyMore"\n', 'import { FamilyMore } from "./FamilyMore"\nimport { FamilyFees } from "./Finance"\n', 'from "./Finance"'],
    ["page", '  else if (page === "More") content = <FamilyMore key={child.id} child={child} />\n', '  else if (page === "More") content = <FamilyMore key={child.id} child={child} />\n  else if (page === "Fees") content = <FamilyFees key={child.id} child={child} />\n', "<FamilyFees"],
  ])
}

const cfg = path.join(process.cwd(), "payload/src/payload.config.ts")
if (fs.existsSync(cfg)) {
  patch("payload/src/payload.config.ts", [
    ["imports", "import { SchoolSettings } from './globals/SchoolSettings'\n",
      "import { SchoolSettings } from './globals/SchoolSettings'\nimport { FeeStructures } from './collections/FeeStructures'\nimport { Invoices } from './collections/Invoices'\nimport { Payments } from './collections/Payments'\nimport { FeeAdjustments } from './collections/FeeAdjustments'\nimport { generateInvoices } from './endpoints/generateInvoices'\n", "collections/FeeStructures"],
    ["collections", "    AssignmentSubmissions,\n  ],", "    AssignmentSubmissions,\n    FeeStructures,\n    Invoices,\n    Payments,\n    FeeAdjustments,\n  ],", "    FeeStructures,\n"],
    ["endpoints", "  endpoints: [familyLogin, registerFamily],\n", "  endpoints: [familyLogin, registerFamily, generateInvoices],\n", "generateInvoices]"],
  ])
} else {
  console.log("payload/ not found, skipped the API side")
}
console.log("Done.")