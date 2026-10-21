import { useCallback, useEffect, useState } from "react"
import type { ReactNode } from "react"

import { apiFind, getCurrentUser } from "./api"
import { errorText, nameOf } from "./AdminPeople"

const ROLE_NAMES: Record<string, string> = {
  super_admin: "Super administrator",
  school_admin: "School administrator",
  academic_admin: "Academic administrator",
  finance_admin: "Finance administrator",
  teacher: "Teacher",
  class_teacher: "Class teacher",
  student: "Learner",
  parent: "Parent / guardian",
}

/** Name and role of the signed-in person, shown in the sidebar. */
export function LiveUserBadge() {
  const user = getCurrentUser()
  const name = user?.name || user?.email || "Signed in"
  const initials = name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase()
  return (
    <>
      <div className="avatar">{initials}</div>
      <div>
        <strong>{name}</strong>
        <span>{ROLE_NAMES[user?.role ?? ""] ?? ""}</span>
      </div>
    </>
  )
}

type TermLite = { name?: string; academicYear?: unknown }

/** The current term, shown in the top bar. */
export function LiveTermBadge() {
  const { rows } = useFind<TermLite>("terms", "limit=1&depth=1&where[isCurrent][equals]=true")
  const term = rows[0]
  const label = term ? [term.name, nameOf(term.academicYear)].filter(Boolean).join(", ") : "No current term"
  return <button className="term-select">{label}</button>
}

/** Loads records from the API. Pass null to skip loading. */
export function useFind<T>(collection: string, query: string | null) {
  const [rows, setRows] = useState<T[]>([])
  const [loading, setLoading] = useState(query !== null)
  const [error, setError] = useState("")
  const reload = useCallback(async () => {
    if (query === null) {
      setRows([])
      setLoading(false)
      return
    }
    try {
      setRows(await apiFind<T>(collection, query))
      setError("")
    } catch (e) {
      setError(errorText(e))
    } finally {
      setLoading(false)
    }
  }, [collection, query])
  useEffect(() => {
    setLoading(query !== null)
    void reload()
  }, [reload, query])
  return { rows, loading, error, reload }
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label>
      <span>{label}</span>
      {children}
    </label>
  )
}

export function Table({ heads, children }: { heads: string[]; children: ReactNode }) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            {heads.map((head) => (
              <th key={head}>{head}</th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  )
}

export const STATUS_LABELS: Record<string, string> = {
  open: "Open for entry",
  submitted: "Waiting for approval",
  approved: "Approved",
  published: "Published",
}

/** Today's date as YYYY-MM-DD in the viewer's own time zone. */
export const todayLocal = () => new Date().toLocaleDateString("en-CA")