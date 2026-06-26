import "server-only"

import {
  extractPlainText,
  type JobPostMetadataResult,
} from "@/lib/job-tracker/job-post-metadata"

import { buildMetadataResult, fetchAtsJson } from "./shared"
import type { AtsMatch, JobPostAdapter } from "./types"

const ASHBY_HOST = /(^|\.)ashbyhq\.com$/i

interface AshbyJob {
  id?: string
  title?: string
  location?: string
  secondaryLocations?: Array<string | { location?: string; name?: string }>
  descriptionPlain?: string
  descriptionHtml?: string
  jobUrl?: string
  applyUrl?: string
  compensation?: {
    compensationTierSummary?: string
    scrapeableCompensationSalarySummary?: string
  }
}

interface AshbyJobBoard {
  jobs?: AshbyJob[]
}

function match(url: URL): AtsMatch | null {
  if (!ASHBY_HOST.test(url.hostname)) return null

  // jobs.ashbyhq.com/{board}/{jobId}
  const [board, jobId] = url.pathname.split("/").filter(Boolean)
  if (!board || !jobId) return null

  return { board, jobId }
}

function isMatchingJob(job: AshbyJob, jobId: string): boolean {
  return (
    job.id === jobId ||
    Boolean(job.jobUrl?.includes(jobId)) ||
    Boolean(job.applyUrl?.includes(jobId))
  )
}

function readSecondaryLocations(
  locations: AshbyJob["secondaryLocations"]
): string[] {
  if (!locations) return []
  return locations.map((entry) =>
    typeof entry === "string" ? entry : entry.location || entry.name || ""
  )
}

async function fetch(url: string): Promise<JobPostMetadataResult | null> {
  const matched = match(new URL(url))
  if (!matched) return null

  const board = await fetchAtsJson<AshbyJobBoard>(
    `https://api.ashbyhq.com/posting-api/job-board/${matched.board}?includeCompensation=true`
  )

  const job = board?.jobs?.find((entry) => isMatchingJob(entry, matched.jobId))
  if (!job?.title) return null

  return buildMetadataResult({
    sourceUrl: url,
    title: job.title,
    salaryText:
      job.compensation?.scrapeableCompensationSalarySummary ||
      job.compensation?.compensationTierSummary,
    locations: [job.location, ...readSecondaryLocations(job.secondaryLocations)],
    descriptionText:
      job.descriptionPlain || extractPlainText(job.descriptionHtml ?? ""),
  })
}

export const ashbyAdapter: JobPostAdapter = {
  name: "ashby",
  match,
  fetch,
}
