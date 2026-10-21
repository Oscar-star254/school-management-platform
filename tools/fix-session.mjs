// Sends people back to the sign-in page when their session has expired. Run from the project root: node tools/fix-session.mjs
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

patch("src/api.ts", [[
  "expired",
  "  if (!response.ok) {\n    const first = body?.errors?.[0]\n",
  "  if (!response.ok) {\n    if ((response.status === 401 || response.status === 403) && currentUser && !path.startsWith(\"/users/\")) {\n      const check = await fetch(\"/api/users/me\", { credentials: \"include\" })\n        .then((r) => r.json())\n        .catch(() => null)\n      if (!check?.user) {\n        currentUser = null\n        window.dispatchEvent(new Event(\"school-session-expired\"))\n        throw new ApiError(\"Your session has expired. Please sign in again.\", 401)\n      }\n    }\n    const first = body?.errors?.[0]\n",
  "school-session-expired",
]])

patch("src/App.tsx", [[
  "listener",
  "  const [checking, setChecking] = useState(API_ENABLED)\n",
  "  const [checking, setChecking] = useState(API_ENABLED)\n  useEffect(() => {\n    if (!API_ENABLED) return\n    const onExpired = () => {\n      hydrateLearners([])\n      setPortal(\"login\")\n    }\n    window.addEventListener(\"school-session-expired\", onExpired)\n    return () => window.removeEventListener(\"school-session-expired\", onExpired)\n  }, [])\n",
  "school-session-expired",
]])
console.log("Done.")