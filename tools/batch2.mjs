// Batch 2: Academics pages. Run from the project root: node tools/batch2.mjs
import fs from "node:fs"
import path from "node:path"

function patch(rel, edits, append = "", appendMarker = "") {
  const file = path.join(process.cwd(), rel)
  if (!fs.existsSync(file)) throw new Error("Missing file: " + rel + " (apply batch 1 first)")
  const raw = fs.readFileSync(file, "utf8")
  const crlf = raw.includes("\r\n")
  let text = raw.replace(/\r\n/g, "\n")
  for (const [name, from, to, marker] of edits) {
    if (text.includes(marker)) continue
    const count = text.split(from).length - 1
    if (count !== 1) throw new Error(rel + ": anchor '" + name + "' found " + count + " times (expected 1)")
    text = text.replace(from, () => to)
  }
  if (append && !text.includes(appendMarker)) text += append
  fs.writeFileSync(file, crlf ? text.replace(/\n/g, "\r\n") : text)
  console.log("patched " + rel)
}

patch("src/api.ts", [], [
  "",
  "export async function apiDelete(collection: string, id: number): Promise<void> {",
  "  await call(`/${collection}/${id}`, { method: \"DELETE\" })",
  "}",
  "",
].join("\n"), "export async function apiDelete")

patch("src/AdminPeople.tsx", [
  ["errorText", "const errorText = (", "export const errorText = (", "export const errorText"],
  ["relId", "const relId = (", "export const relId = (", "export const relId"],
  ["nameOf", "const nameOf = (", "export const nameOf = (", "export const nameOf"],
  ["useRows", "function useRows<T>(", "export function useRows<T>(", "export function useRows"],
  ["Page", "function Page(", "export function Page(", "export function Page"],
  ["Note", "function Note(", "export function Note(", "export function Note"],
  ["Empty", "function Empty(", "export function Empty(", "export function Empty"],
  ["Msg", "type Msg = ", "export type Msg = ", "export type Msg"],
])

patch("src/PortalModules.tsx", [
  ["import", '} from "./AdminPeople"\n', '} from "./AdminPeople"\nimport { LearningAreasLive, TermsClassesLive } from "./AdminAcademics"\n', "AdminAcademics"],
  ["cases", '    case "Audit log":\n      return <AuditLive />\n', '    case "Audit log":\n      return <AuditLive />\n    case "Terms & classes":\n      return <TermsClassesLive />\n    case "Learning areas":\n      return <LearningAreasLive />\n', "TermsClassesLive />"],
])
console.log("Done.")