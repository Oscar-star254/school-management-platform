import type { Learner, LearnerStatus } from "./schoolStore"

/** When true the app talks to the school API (Payload). When false it runs the offline demo. */
export const API_ENABLED = import.meta.env.VITE_USE_API === "true"

export type PortalName = "student" | "teacher" | "admin"
export type ApiUser = {
  id: number
  email: string
  name?: string
  role?: string
  status?: string
}

class ApiError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

const ADMIN_ROLES = ["super_admin", "school_admin", "academic_admin", "finance_admin"]
const TEACHING_ROLES = ["teacher", "class_teacher"]

/** Maps a school role to the portal screen set it should see. Parents use the family portal. */
export function portalForRole(role?: string): PortalName | null {
  if (!role) return null
  if (ADMIN_ROLES.includes(role)) return "admin"
  if (TEACHING_ROLES.includes(role)) return "teacher"
  if (role === "student" || role === "parent") return "student"
  return null
}

async function call(path: string, init: RequestInit = {}) {
  const response = await fetch(`/api${path}`, {
    credentials: "include",
    ...init,
    headers: { "Content-Type": "application/json", ...(init.headers ?? {}) },
  })
  const body = await response.json().catch(() => ({}))
  if (!response.ok) {
    const message =
      body?.errors?.[0]?.message ?? body?.message ?? `Request failed (${response.status})`
    throw new ApiError(message, response.status)
  }
  return body
}

export async function apiLogin(email: string, password: string): Promise<ApiUser> {
  const data = await call("/users/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  })
  return data.user as ApiUser
}

export async function apiMe(): Promise<ApiUser | null> {
  try {
    const data = await call("/users/me")
    return (data.user as ApiUser | null) ?? null
  } catch {
    return null
  }
}

export async function apiLogout(): Promise<void> {
  try {
    await call("/users/logout", { method: "POST" })
  } catch {
    /* ignore: the cookie is cleared or already expired */
  }
}

type ApiStudent = {
  id: number
  admissionNumber?: string | null
  name?: string | null
  status?: string | null
  currentClass?: number | { name?: string | null } | null
}

const STATUS: Record<string, LearnerStatus> = {
  active: "Active",
  completed: "Completed",
  transferred: "Transferred",
  withdrawn: "Transferred",
}

/** Students this user is allowed to see (the server applies the access rules). */
export async function apiLearners(): Promise<Learner[]> {
  try {
    const data = await call("/students?limit=1000&depth=1&sort=name")
    return (data.docs as ApiStudent[]).map((student) => ({
      admission: student.admissionNumber ?? `ID-${student.id}`,
      name: student.name ?? "",
      grade:
        typeof student.currentClass === "object" && student.currentClass
          ? (student.currentClass.name ?? "")
          : "",
      status: STATUS[student.status ?? "active"] ?? "Active",
      guardian: "—",
      phone: "—",
    }))
  } catch (error) {
    if (error instanceof ApiError && error.status === 403) return []
    throw error
  }
}