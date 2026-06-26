import "server-only"

import {
  cleanText,
  findSalaryInText,
  findSkillsInText,
  uniqueValues,
  type JobPostMetadataResult,
} from "@/lib/job-tracker/job-post-metadata"

const ATS_REQUEST_TIMEOUT_MS = 10_000

/**
 * Fetches JSON from an ATS public API. Returns null on any failure (non-2xx,
 * timeout, network or parse error) so adapters degrade to the generic scraper.
 */
export async function fetchAtsJson<T>(
  url: string,
  timeoutMs = ATS_REQUEST_TIMEOUT_MS
): Promise<T | null> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const response = await fetch(url, {
      cache: "no-store",
      headers: { Accept: "application/json" },
      redirect: "follow",
      signal: controller.signal,
    })

    if (!response.ok) return null
    return (await response.json()) as T
  } catch {
    return null
  } finally {
    clearTimeout(timeoutId)
  }
}

export interface BuildMetadataInput {
  sourceUrl: string
  title: string
  /** Structured salary text from the API; used verbatim when present. */
  salaryText?: string | null
  /** Raw location strings from the API; stored as-is (no catalog normalization). */
  locations?: Array<string | null | undefined>
  /** Plain-text job description, used for skill detection and salary fallback. */
  descriptionText?: string
}

/**
 * Maps structured ATS fields into a JobPostMetadataResult, reusing the same
 * skill/salary extraction and success/partial/failed scoring as the generic
 * HTML path so downstream analysis stays consistent.
 */
export function buildMetadataResult({
  sourceUrl,
  title,
  salaryText,
  locations = [],
  descriptionText = "",
}: BuildMetadataInput): JobPostMetadataResult {
  const cleanedTitle = cleanText(title)
  const searchText = `${cleanedTitle}\n${descriptionText}`

  const salary =
    cleanText(salaryText ?? "") || findSalaryInText(descriptionText) || ""
  const cleanedLocations = uniqueValues(
    locations.filter((value): value is string => Boolean(value))
  ).slice(0, 6)
  const skills = findSkillsInText(searchText).slice(0, 15)

  const extractedFieldCount =
    (salary ? 1 : 0) +
    (cleanedLocations.length > 0 ? 1 : 0) +
    (skills.length > 0 ? 1 : 0)

  if (extractedFieldCount === 0) {
    return {
      sourceUrl,
      sourceTitle: cleanedTitle,
      salaryText: "",
      locations: [],
      skills: [],
      extractionStatus: "failed",
      extractionError: "No salary, location, or skills could be extracted",
      fetchedAt: new Date(),
    }
  }

  return {
    sourceUrl,
    sourceTitle: cleanedTitle,
    salaryText: salary,
    locations: cleanedLocations,
    skills,
    extractionStatus: extractedFieldCount >= 2 ? "success" : "partial",
    extractionError: "",
    fetchedAt: new Date(),
  }
}
