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

type FieldError = { path?: string; field?: string; message?: string }

async function call(path: string, init: RequestInit = {}) {
  const response = await fetch(`/api${path}`, {
    credentials: "include",
    ...init,
    headers: { "Content-Type": "application/json", ...(init.headers ?? {}) },
  })
  const body = await response.json().catch(() => ({}))
  if (!response.ok) {
    if ((response.status === 401 || response.status === 403) && currentUser && !path.startsWith("/users/")) {
      const check = await fetch("/api/users/me", { credentials: "include" })
        .then((r) => r.json())
        .catch(() => null)
      if (!check?.user) {
        currentUser = null
        window.dispatchEvent(new Event("school-session-expired"))
        throw new ApiError("Your session has expired. Please sign in again.", 401)
      }
    }
    const first = body?.errors?.[0]
    const details = (first?.data?.errors as FieldError[] | undefined)
      ?.map((e) => `${e.path ?? e.field ?? "field"}: ${e.message ?? "invalid"}`)
      .join("; ")
    const message =
      details || first?.message || body?.message || `Request failed (${response.status})`
    throw new ApiError(message, response.status)
  }
  return body
}

export async function apiLogin(email: string, password: string): Promise<ApiUser> {
  const byEmail = email.includes("@")
  const data = await call(byEmail ? "/users/login" : "/family-login", {
    method: "POST",
    body: JSON.stringify(byEmail ? { email, password } : { identifier: email, password }),
  })
  currentUser = data.user as ApiUser
  return currentUser
}

export async function apiMe(): Promise<ApiUser | null> {
  try {
    const data = await call("/users/me")
    currentUser = (data.user as ApiUser | null) ?? null
    return currentUser
  } catch {
    return null
  }
}

export async function apiLogout(): Promise<void> {
  try {
    await call("/users/logout", { method: "POST" })
    currentUser = null
  } catch {
    /* ignore: the cookie is cleared or already expired */
  }
}

/** List records of a collection. `query` is a URL query string (limit, depth, sort, where). */
export async function apiFind<T>(collection: string, query = "limit=200&depth=0"): Promise<T[]> {
  const data = await call(`/${collection}?${query}`)
  return data.docs as T[]
}

export async function apiCount(collection: string): Promise<number> {
  const data = await call(`/${collection}?limit=1&depth=0`)
  return data.totalDocs as number
}

export async function apiCreate<T = Record<string, unknown>>(
  collection: string,
  data: Record<string, unknown>,
): Promise<T> {
  const result = await call(`/${collection}`, { method: "POST", body: JSON.stringify(data) })
  return result.doc as T
}

export async function apiUpdate(
  collection: string,
  id: number,
  data: Record<string, unknown>,
): Promise<void> {
  await call(`/${collection}/${id}`, { method: "PATCH", body: JSON.stringify(data) })
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
export async function apiDelete(collection: string, id: number): Promise<void> {
  await call(`/${collection}/${id}`, { method: "DELETE" })
}

let currentUser: ApiUser | null = null
export const getCurrentUser = () => currentUser

export type FamilyRegistration = {
  firstName: string
  lastName: string
  dateOfBirth?: string
  classId?: number
  password?: string
  createStudentLogin?: boolean
  studentEmail?: string
  guardians: { existingId?: number; name?: string; phone?: string; email?: string; relationship?: string }[]
}

/** Registers a learner and up to two guardians in one step. */
export async function apiRegisterFamily(body: FamilyRegistration) {
  const data = await call("/register-family", { method: "POST", body: JSON.stringify(body) })
  return data as { admissionNumber: string; studentId: number; accounts: { name: string; signIn: string }[] }
}

/** Reads a school-wide settings record. */
export async function apiGlobal<T>(slug: string): Promise<T> {
  return (await call(`/globals/${slug}`)) as T
}

export async function apiSaveGlobal(slug: string, data: Record<string, unknown>): Promise<void> {
  await call(`/globals/${slug}`, { method: "POST", body: JSON.stringify(data) })
}
