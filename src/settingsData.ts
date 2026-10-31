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

  primaryColor?: string | null

  schoolBadgeUrl?: string | null

  reportTemplate?: "classic" | "modern" | null

  invoiceTemplate?: "classic" | "modern" | null

  invoiceFooter?: string | null

  gradeBands?: (GradeBand & { id?: string })[]
}

/** Puts the school's saved name, motto and grading levels to work across the whole app. */

export function applySchoolSettings(settings: SchoolSettingsDoc) {
  hydrateSchool({
    schoolName: settings.schoolName,
    motto: settings.motto,
    schoolBadgeUrl: settings.schoolBadgeUrl,
  })

  if (settings.schoolName) document.title = `Smartschool | ${settings.schoolName}`

  if (settings.primaryColor && /^#[0-9a-fA-F]{6}$/.test(settings.primaryColor)) {
    document.documentElement.style.setProperty("--primary", settings.primaryColor)

    document.documentElement.style.setProperty(
      "--primary-600",
      `color-mix(in srgb, ${settings.primaryColor} 82%, #17232d)`,
    )

    document.documentElement.style.setProperty(
      "--primary-soft",
      `color-mix(in srgb, ${settings.primaryColor} 12%, white)`,
    )

    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute("content", settings.primaryColor)
  }

  setReportProfile({
    principalName: settings.principalName,

    reportFooter: settings.reportFooter,

    phone: settings.phone,

    email: settings.email,

    address: settings.address,

    primaryColor: settings.primaryColor,

    reportTemplate: settings.reportTemplate,

    invoiceTemplate: settings.invoiceTemplate,

    invoiceFooter: settings.invoiceFooter,
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
