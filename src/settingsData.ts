import { apiGlobal } from "./api"
import { setGradeBands, setReportProfile } from "./resultsData"
import type { GradeBand } from "./resultsData"
import { hydrateSchool } from "./schoolStore"

export type SchoolSettingsDoc = {
  schoolName?: string
  motto?: string | null
  phone?: string | null
  email?: string | null
  address?: string | null
  principalName?: string | null
  reportFooter?: string | null
  gradeBands?: (GradeBand & { id?: string })[]
}

/** Puts the school's saved name, motto and grading levels to work across the whole app. */
export function applySchoolSettings(settings: SchoolSettingsDoc) {
  hydrateSchool({ schoolName: settings.schoolName, motto: settings.motto })
  if (settings.schoolName)
    document.title = `Smartschool | ${settings.schoolName}`
  setReportProfile({
    principalName: settings.principalName,
    reportFooter: settings.reportFooter,
    phone: settings.phone,
    email: settings.email,
    address: settings.address,
  })
  if (settings.gradeBands?.length) setGradeBands(settings.gradeBands)
}

export async function loadSchoolSettings(): Promise<SchoolSettingsDoc | null> {
  try {
    const settings = await apiGlobal<SchoolSettingsDoc>("school-settings")
    applySchoolSettings(settings)
    return settings
  } catch {
    return null
  }
}