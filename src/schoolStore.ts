import { useSyncExternalStore } from "react"

import { API_ENABLED } from "./api"

export const SUBJECTS = [
  "English",

  "Kiswahili",

  "Mathematics",

  "Science & Technology",

  "Social Studies",

  "Agriculture & Nutrition",
] as const

export type LearnerStatus = "Active" | "Completed" | "Transferred"

export type Learner = {
  admission: string

  name: string

  grade: string

  status: LearnerStatus

  guardian: string

  phone: string
}

type SchoolState = {
  schoolName: string

  motto: string

  schoolBadgeUrl?: string

  schoolPhotoUrl?: string

  learners: Learner[]

  marks: Record<string, Record<string, number | null>>
}

const initialLearners: Learner[] = [
  {
    admission: "ADM-1042",

    name: "Amani Mwangi",

    grade: "Grade 5 East",

    status: "Active",

    guardian: "Lucy Mwangi",

    phone: "254700123456",
  },

  {
    admission: "ADM-1043",

    name: "Baraka Otieno",

    grade: "Grade 5 East",

    status: "Active",

    guardian: "Peter Otieno",

    phone: "254711234567",
  },

  {
    admission: "ADM-1044",

    name: "Chebet Koech",

    grade: "Grade 5 East",

    status: "Active",

    guardian: "Mercy Koech",

    phone: "254722345678",
  },

  {
    admission: "ADM-1045",

    name: "Dalia Hassan",

    grade: "Grade 5 East",

    status: "Active",

    guardian: "Asha Hassan",

    phone: "254733456789",
  },

  {
    admission: "ADM-1046",

    name: "Eliud Kamau",

    grade: "Grade 5 East",

    status: "Active",

    guardian: "John Kamau",

    phone: "254744567890",
  },
]

function seededMarks(index: number) {
  return Object.fromEntries(
    SUBJECTS.map((subject, subjectIndex) => [subject, Math.max(42, 78 - index * 3 + subjectIndex)]),
  )
}

const initialState: SchoolState = {
  schoolName: "Smart Schools Kindergarten",

  motto: "Learn · Grow · Lead",

  schoolBadgeUrl: "",

  schoolPhotoUrl: "",

  learners: initialLearners,

  marks: Object.fromEntries(
    initialLearners.map((learner, index) => [learner.admission, seededMarks(index)]),
  ),
}

const serverInitialState: SchoolState = {
  ...initialState,
  learners: [],
  marks: {},
  schoolName: "",
  motto: "",
}

function guardDemo() {
  if (API_ENABLED)
    throw new Error(
      "This action is not connected to the school database yet. Please use the school admin panel.",
    )
}

const storageKey = "greenfield-school-data-v1"

let state: SchoolState = load()

const listeners = new Set<() => void>()

function load(): SchoolState {
  if (API_ENABLED) return serverInitialState

  try {
    const stored = localStorage.getItem(storageKey)

    if (!stored) return initialState

    const savedState: Partial<SchoolState> = JSON.parse(stored)

    return {
      ...initialState,

      ...savedState,

      schoolName:
        savedState.schoolName === "Greenfield Academy"
          ? initialState.schoolName
          : (savedState.schoolName ?? initialState.schoolName),
    }
  } catch {
    return initialState
  }
}

function save(next: SchoolState) {
  state = next

  if (!API_ENABLED) localStorage.setItem(storageKey, JSON.stringify(state))

  listeners.forEach((listener) => listener())
}

export function useSchoolStore() {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener)

      return () => listeners.delete(listener)
    },

    () => state,

    () => initialState,
  )
}

export function setActiveLearner(admission: string) {
  sessionStorage.setItem("greenfield-active-learner", admission.toUpperCase())
}

export function activeLearner(store: SchoolState) {
  const admission = sessionStorage.getItem("greenfield-active-learner") ?? "ADM-1042"

  return store.learners.find(
    (learner) =>
      learner.admission.toUpperCase() === admission.toUpperCase() && learner.status === "Active",
  )
}

export const schoolActions = {
  updateMark(admission: string, subject: string, mark: number | null) {
    guardDemo()

    save({
      ...state,

      marks: {
        ...state.marks,

        [admission]: { ...(state.marks[admission] ?? {}), [subject]: mark },
      },
    })
  },

  addLearner(learner: Learner) {
    guardDemo()

    if (
      state.learners.some(
        (item) => item.admission.toLowerCase() === learner.admission.toLowerCase(),
      )
    )
      throw new Error("Admission number already exists")

    save({
      ...state,

      learners: [...state.learners, learner],

      marks: {
        ...state.marks,

        [learner.admission]: Object.fromEntries(SUBJECTS.map((subject) => [subject, null])),
      },
    })
  },

  updateLearner(admission: string, changes: Partial<Learner>) {
    guardDemo()

    save({
      ...state,

      learners: state.learners.map((learner) =>
        learner.admission === admission ? { ...learner, ...changes } : learner,
      ),
    })
  },

  updateSchool(settings: Pick<SchoolState, "schoolName" | "motto">) {
    guardDemo()

    save({ ...state, ...settings })
  },

  resetDemo() {
    guardDemo()

    save(initialState)
  },
}

export function learnerResults(store: SchoolState, admission: string) {
  return SUBJECTS.map((area) => {
    const score = store.marks[admission]?.[area] ?? null

    const level =
      score === null ? "—" : score >= 75 ? "EE" : score >= 41 ? "ME" : score >= 21 ? "AE" : "BE"

    return {
      area,

      score,

      level,

      remark:
        score === null
          ? "Not assessed"
          : score >= 75
            ? "Exceeding expectations"
            : score >= 41
              ? "Meeting expectations"
              : score >= 21
                ? "Approaching expectations"
                : "Requires support",
    }
  })
}

export function reportReady(store: SchoolState, admission: string) {
  return SUBJECTS.every((subject) => typeof store.marks[admission]?.[subject] === "number")
}

/** Replaces the learner list with data from the school server (not saved in the browser). */

export function hydrateLearners(learners: Learner[]) {
  const empty = Object.fromEntries(SUBJECTS.map((subject) => [subject, null]))

  state = {
    ...state,

    learners,

    marks: Object.fromEntries(
      learners.map((learner) => [learner.admission, state.marks[learner.admission] ?? empty]),
    ),
  }

  listeners.forEach((listener) => listener())
}

/** Applies the school's saved name and motto (from School Settings). */

export function hydrateSchool(settings: {
  schoolName?: string | null
  motto?: string | null
  schoolBadgeUrl?: string | null
  schoolPhotoUrl?: string | null
}) {
  state = {
    ...state,

    schoolName: settings.schoolName || state.schoolName,

    motto: settings.motto ?? "",

    schoolBadgeUrl: settings.schoolBadgeUrl ?? state.schoolBadgeUrl,

    schoolPhotoUrl: settings.schoolPhotoUrl ?? state.schoolPhotoUrl,
  }

  listeners.forEach((listener) => listener())
}
