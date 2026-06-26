import "server-only"

import {
  decodeHtmlEntities,
  extractPlainText,
  type JobPostMetadataResult,
} from "@/lib/job-tracker/job-post-metadata"

import { buildMetadataResult, fetchAtsJson } from "./shared"
import type { AtsMatch, JobPostAdapter } from "./types"

// boards.greenhouse.io / job-boards.greenhouse.io / boards.eu.greenhouse.io
const GREENHOUSE_HOST = /(^|\.)greenhouse\.io$/i
const SALARY_FIELD = /salary|compensation|pay|comp\b/i

interface GreenhouseJob {
  title?: string
  content?: string
  location?: { name?: string }
  offices?: Array<{ name?: string; location?: string }>
  metadata?: Array<{ name?: string; value?: unknown }>
}

function match(url: URL): AtsMatch | null {
  if (!GREENHOUSE_HOST.test(url.hostname)) return null

  // boards.greenhouse.io/{board}/jobs/{id}
  const segments = url.pathname.split("/").filter(Boolean)
  const jobsIndex = segments.indexOf("jobs")
  if (jobsIndex < 1) return null

  const board = segments[jobsIndex - 1]
  const jobId = segments[jobsIndex + 1]
  if (!board || !jobId) return null

  return { board, jobId }
}

function extractSalary(metadata: GreenhouseJob["metadata"]): string | undefined {
  if (!metadata) return undefined

  for (const field of metadata) {
    if (!field?.name || !SALARY_FIELD.test(field.name)) continue
    if (typeof field.value === "string" && field.value.trim()) {
      return field.value
    }
  }

  return undefined
}

async function fetch(url: string): Promise<JobPostMetadataResult | null> {
  const matched = match(new URL(url))
  if (!matched) return null

  const job = await fetchAtsJson<GreenhouseJob>(
    `https://boards-api.greenhouse.io/v1/boards/${matched.board}/jobs/${matched.jobId}?content=true`
  )
  if (!job?.title) return null

  return buildMetadataResult({
    sourceUrl: url,
    title: job.title,
    salaryText: extractSalary(job.metadata),
    locations: [
      job.location?.name,
      ...(job.offices ?? []).map((office) => office.location || office.name),
    ],
    // `content` is HTML-entity-encoded HTML, so decode before stripping tags.
    descriptionText: extractPlainText(decodeHtmlEntities(job.content ?? "")),
  })
}

export const greenhouseAdapter: JobPostAdapter = {
  name: "greenhouse",
  match,
  fetch,
}
