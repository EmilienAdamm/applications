import "server-only"

import {
  extractPlainText,
  formatSalaryRange,
  type JobPostMetadataResult,
} from "@/lib/job-tracker/job-post-metadata"

import { buildMetadataResult, fetchAtsJson } from "./shared"
import type { AtsMatch, JobPostAdapter } from "./types"

// jobs.lever.co / jobs.eu.lever.co
const LEVER_HOST = /(^|\.)lever\.co$/i

interface LeverPosting {
  text?: string
  categories?: {
    location?: string
    allLocations?: string[]
    team?: string
    department?: string
    commitment?: string
  }
  descriptionPlain?: string
  additionalPlain?: string
  lists?: Array<{ text?: string; content?: string }>
  salaryRange?: {
    currency?: string
    min?: number
    max?: number
    interval?: string
  }
  salaryDescriptionPlain?: string
}

// Lever intervals look like "per-year-salary", "per-hour-wage", etc.
const LEVER_INTERVAL_UNIT: Record<string, string> = {
  "per-year-salary": "year",
  "per-month-salary": "month",
  "per-week-salary": "week",
  "per-day-wage": "day",
  "per-hour-wage": "hour",
}

function match(url: URL): AtsMatch | null {
  if (!LEVER_HOST.test(url.hostname)) return null

  // jobs.lever.co/{board}/{jobId}
  const [board, jobId] = url.pathname.split("/").filter(Boolean)
  if (!board || !jobId) return null

  return { board, jobId }
}

function buildSalary(posting: LeverPosting): string | undefined {
  const range = posting.salaryRange
  if (range && (typeof range.min === "number" || typeof range.max === "number")) {
    const unit = range.interval
      ? LEVER_INTERVAL_UNIT[range.interval] ?? null
      : null
    const formatted = formatSalaryRange(
      range.currency ?? null,
      range.min ?? null,
      range.max ?? null,
      unit
    )
    if (formatted) return formatted
  }

  return posting.salaryDescriptionPlain || undefined
}

async function fetch(url: string): Promise<JobPostMetadataResult | null> {
  const matched = match(new URL(url))
  if (!matched) return null

  const posting = await fetchAtsJson<LeverPosting>(
    `https://api.lever.co/v0/postings/${matched.board}/${matched.jobId}?mode=json`
  )
  if (!posting?.text) return null

  const descriptionText = [
    posting.descriptionPlain,
    ...(posting.lists ?? []).map((list) =>
      `${list.text ?? ""} ${extractPlainText(list.content ?? "")}`
    ),
    posting.additionalPlain,
  ]
    .filter(Boolean)
    .join("\n")

  return buildMetadataResult({
    sourceUrl: url,
    title: posting.text,
    salaryText: buildSalary(posting),
    locations: [
      posting.categories?.location,
      ...(posting.categories?.allLocations ?? []),
    ],
    descriptionText,
  })
}

export const leverAdapter: JobPostAdapter = {
  name: "lever",
  match,
  fetch,
}
