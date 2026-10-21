// Drop 1b: report forms page. Run from the project root: node tools/drop1b.mjs
import fs from "node:fs"
import path from "node:path"

const file = path.join(process.cwd(), "src/PortalModules.tsx")
if (!fs.existsSync(file)) throw new Error("Missing src/PortalModules.tsx")
const raw = fs.readFileSync(file, "utf8")
const crlf = raw.includes("\r\n")
let text = raw.replace(/\r\n/g, "\n")

function edit(name, from, to, marker) {
  if (text.includes(marker)) return
  const count = text.split(from).length - 1
  if (count !== 1) throw new Error("anchor '" + name + "' found " + count + " times (expected 1; install Drop 1a first)")
  text = text.replace(from, () => to)
}

edit("import", 'import { ResultsMonitorLive } from "./AdminResults"\n',
  'import { ResultsMonitorLive } from "./AdminResults"\nimport { ReportFormsLive } from "./AdminReports"\n', "AdminReports")
edit("case", '    case "Results monitor":\n      return <ResultsMonitorLive />\n',
  '    case "Results monitor":\n      return <ResultsMonitorLive />\n    case "Report forms":\n      return <ReportFormsLive />\n', "ReportFormsLive />")

fs.writeFileSync(file, crlf ? text.replace(/\n/g, "\r\n") : text)
console.log("patched src/PortalModules.tsx")
console.log("Done.")