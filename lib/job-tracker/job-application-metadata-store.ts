import "server-only"

import { and, eq, sql } from "drizzle-orm"

import { db } from "@/lib/db"
import { jobApplicationMetadata } from "@/lib/db/schema"
import {
  fetchJobPostMetadata,
  normalizeJobPostUrl,
} from "@/lib/job-tracker/job-post-metadata"
import type { JobApplicationMetadata } from "@/lib/job-tracker/types"

let metadataStorageReady: Promise<void> | null = null

export async function ensureJobApplicationMetadataStorage() {
  if (metadataStorageReady) {
    await metadataStorageReady
    return
  }

  metadataStorageReady = (async () => {
    await db.execute(sql`
      create table if not exists job_application_metadata (
        id uuid primary key default gen_random_uuid(),
        application_id uuid not null,
        user_id text not null,
        source_url text not null default '',
        source_title text not null default '',
        salary_text text not null default '',
        locations jsonb not null default '[]'::jsonb,
        skills jsonb not null default '[]'::jsonb,
        extraction_status text not null default 'failed',
        extraction_error text not null default '',
        fetched_at timestamptz not null default now(),
        created_at timestamptz not null default now(),
        updated_at timestamptz not null default now()
      )
    `)

    await db.execute(sql`
      create unique index if not exists idx_job_application_metadata_application_id
      on job_application_metadata (application_id)
    `)

    await db.execute(sql`
      create index if not exists idx_job_application_metadata_user_id
      on job_application_metadata (user_id)
    `)
  })()

  await metadataStorageReady
}

export async function syncApplicationMetadata(
  userId: string,
  applicationId: string,
  jobOfferLink: string
): Promise<JobApplicationMetadata | null> {
  return runApplicationMetadataSearch(userId, applicationId, jobOfferLink)
}

export async function queueApplicationMetadataSearch(
  userId: string,
  applicationId: string,
  jobOfferLink: string
): Promise<JobApplicationMetadata | null> {
  const normalizedUrl = normalizeJobPostUrl(jobOfferLink)

  await ensureJobApplicationMetadataStorage()

  if (!normalizedUrl) {
    await deleteApplicationMetadata(userId, applicationId)
    return null
  }

  return upsertMetadataRow({
    applicationId,
    userId,
    sourceUrl: normalizedUrl,
    sourceTitle: "",
    salaryText: "",
    locations: [],
    skills: [],
    extractionStatus: "queued",
    extractionError: "",
    fetchedAt: new Date(),
  })
}

export async function runApplicationMetadataSearch(
  userId: string,
  applicationId: string,
  jobOfferLink: string
): Promise<JobApplicationMetadata | null> {
  const normalizedUrl = normalizeJobPostUrl(jobOfferLink)

  await ensureJobApplicationMetadataStorage()

  if (!normalizedUrl) {
    await deleteApplicationMetadata(userId, applicationId)
    return null
  }

  await upsertMetadataRow({
    applicationId,
    userId,
    sourceUrl: normalizedUrl,
    sourceTitle: "",
    salaryText: "",
    locations: [],
    skills: [],
    extractionStatus: "processing",
    extractionError: "",
    fetchedAt: new Date(),
  })

  const metadata = await fetchJobPostMetadata(normalizedUrl)
  if (!metadata) return null

  return upsertMetadataRow({
    applicationId,
    userId,
    sourceUrl: metadata.sourceUrl,
    sourceTitle: metadata.sourceTitle,
    salaryText: metadata.salaryText,
    locations: metadata.locations,
    skills: metadata.skills,
    extractionStatus: metadata.extractionStatus,
    extractionError: metadata.extractionError,
    fetchedAt: metadata.fetchedAt,
  })
}

export async function deleteApplicationMetadata(
  userId: string,
  applicationId: string
) {
  await ensureJobApplicationMetadataStorage()

  await db
    .delete(jobApplicationMetadata)
    .where(
      and(
        eq(jobApplicationMetadata.applicationId, applicationId),
        eq(jobApplicationMetadata.userId, userId)
      )
    )
}

export async function fetchApplicationMetadataByUser(
  userId: string
): Promise<Record<string, JobApplicationMetadata>> {
  await ensureJobApplicationMetadataStorage()

  const rows = await db
    .select()
    .from(jobApplicationMetadata)
    .where(eq(jobApplicationMetadata.userId, userId))

  return Object.fromEntries(
    rows.map((row) => {
      const metadata = mapMetadataRow(row)
      return [metadata.applicationId, metadata]
    })
  )
}

export async function fetchApplicationMetadataForUserApplication(
  userId: string,
  applicationId: string
): Promise<JobApplicationMetadata | null> {
  await ensureJobApplicationMetadataStorage()

  const [row] = await db
    .select()
    .from(jobApplicationMetadata)
    .where(
      and(
        eq(jobApplicationMetadata.userId, userId),
        eq(jobApplicationMetadata.applicationId, applicationId)
      )
    )
    .limit(1)

  return row ? mapMetadataRow(row) : null
}

async function upsertMetadataRow(
  value: Omit<JobApplicationMetadata, "fetchedAt"> & { userId: string; fetchedAt: Date }
) {
  const [row] = await db
    .insert(jobApplicationMetadata)
    .values({
      applicationId: value.applicationId,
      userId: value.userId,
      sourceUrl: value.sourceUrl,
      sourceTitle: value.sourceTitle,
      salaryText: value.salaryText,
      locations: value.locations,
      skills: value.skills,
      extractionStatus: value.extractionStatus,
      extractionError: value.extractionError,
      fetchedAt: value.fetchedAt,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: jobApplicationMetadata.applicationId,
      set: {
        userId: value.userId,
        sourceUrl: value.sourceUrl,
        sourceTitle: value.sourceTitle,
        salaryText: value.salaryText,
        locations: value.locations,
        skills: value.skills,
        extractionStatus: value.extractionStatus,
        extractionError: value.extractionError,
        fetchedAt: value.fetchedAt,
        updatedAt: new Date(),
      },
    })
    .returning()

  return mapMetadataRow(row)
}

function mapMetadataRow(
  row: typeof jobApplicationMetadata.$inferSelect
): JobApplicationMetadata {
  return {
    applicationId: row.applicationId,
    sourceUrl: row.sourceUrl,
    sourceTitle: row.sourceTitle,
    salaryText: row.salaryText,
    locations: row.locations ?? [],
    skills: row.skills ?? [],
    extractionStatus: row.extractionStatus as JobApplicationMetadata["extractionStatus"],
    extractionError: row.extractionError,
    fetchedAt:
      row.fetchedAt instanceof Date
        ? row.fetchedAt.toISOString()
        : String(row.fetchedAt),
  }
}
