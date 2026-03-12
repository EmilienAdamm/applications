"use server"

import { after } from "next/server"

import { db } from "@/lib/db"
import { jobApplications, userOptions } from "@/lib/db/schema"
import { auth } from "@/lib/auth"
import {
  deleteApplicationMetadata,
  fetchApplicationMetadataForUserApplication,
  queueApplicationMetadataSearch,
  runApplicationMetadataSearch,
  syncApplicationMetadata,
} from "@/lib/job-tracker/job-application-metadata-store"
import { normalizeJobPostUrl } from "@/lib/job-tracker/job-post-metadata"
import {
  fetchTrackerSettingsByUser,
  updateDeeperSearchSetting,
} from "@/lib/job-tracker/tracker-settings-store"
import type {
  ApplicationFieldKey,
  JobApplicationMetadata,
  NewApplicationForm,
  OptionCategory,
  TrackerSettings,
  TrackerOptions,
  UserOption,
} from "@/lib/job-tracker/types"
import { and, eq } from "drizzle-orm"
import { headers } from "next/headers"

async function getAuthenticatedUserId(): Promise<string> {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user?.id) throw new Error("Not authenticated")
  return session.user.id
}

// ─── Applications ────────────────────────────────────────────────────────────

export async function fetchApplications() {
  const userId = await getAuthenticatedUserId()
  const rows = await db
    .select()
    .from(jobApplications)
    .where(eq(jobApplications.userId, userId))
    .orderBy(jobApplications.createdAt)
  return rows.map((r) => ({
    id: r.id,
    companyName: r.companyName,
    jobPosition: r.jobPosition,
    dateOfApplication: r.dateOfApplication,
    jobOfferLink: r.jobOfferLink,
    cvUsed: r.cvUsed,
    emailUsed: r.emailUsed,
    status: r.status,
    finalStatus: r.finalStatus,
  }))
}

export async function addApplication(
  form: NewApplicationForm
): Promise<{
  id: string
  metadata: JobApplicationMetadata | null
  deeperSearchQueued: boolean
}> {
  const userId = await getAuthenticatedUserId()
  const settings = await fetchTrackerSettingsByUser(userId)
  const normalizedForm = {
    companyName: form.companyName.trim(),
    jobPosition: form.jobPosition.trim(),
    dateOfApplication: form.dateOfApplication,
    jobOfferLink: form.jobOfferLink.trim(),
    cvUsed: form.cvUsed,
    emailUsed: form.emailUsed,
    status: form.status,
    finalStatus: form.finalStatus,
  }

  const [row] = await db
    .insert(jobApplications)
    .values({
      userId,
      ...normalizedForm,
    })
    .returning({ id: jobApplications.id })

  let metadata: JobApplicationMetadata | null = null
  const shouldQueueDeeperSearch =
    settings.deeperSearchEnabled &&
    Boolean(normalizeJobPostUrl(normalizedForm.jobOfferLink))

  if (shouldQueueDeeperSearch) {
    try {
      metadata = await queueApplicationMetadataSearch(
        userId,
        row.id,
        normalizedForm.jobOfferLink
      )
      after(async () => {
        await runApplicationMetadataSearch(userId, row.id, normalizedForm.jobOfferLink)
      })
    } catch (error) {
      console.error("Failed to queue application metadata", error)
    }
  }

  return { id: row.id, metadata, deeperSearchQueued: shouldQueueDeeperSearch }
}

export async function deleteApplication(id: string): Promise<void> {
  const userId = await getAuthenticatedUserId()
  await db
    .delete(jobApplications)
    .where(
      and(eq(jobApplications.id, id), eq(jobApplications.userId, userId))
    )

  try {
    await deleteApplicationMetadata(userId, id)
  } catch (error) {
    console.error("Failed to delete application metadata", error)
  }
}

export async function updateApplicationField(
  id: string,
  field: ApplicationFieldKey,
  value: string
): Promise<JobApplicationMetadata | null> {
  const userId = await getAuthenticatedUserId()
  const settings = await fetchTrackerSettingsByUser(userId)
  await db
    .update(jobApplications)
    .set({ [field]: value.trim(), updatedAt: new Date() })
    .where(
      and(eq(jobApplications.id, id), eq(jobApplications.userId, userId))
    )

  if (field === "jobOfferLink") {
    try {
      if (settings.deeperSearchEnabled) {
        if (!normalizeJobPostUrl(value)) {
          await deleteApplicationMetadata(userId, id)
          return null
        }

        const metadata = await queueApplicationMetadataSearch(userId, id, value)
        after(async () => {
          await runApplicationMetadataSearch(userId, id, value)
        })
        return metadata
      }

      await deleteApplicationMetadata(userId, id)
      return null
    } catch (error) {
      console.error("Failed to refresh application metadata", error)
    }
  }

  return null
}

export async function refreshApplicationMetadata(
  id: string
): Promise<JobApplicationMetadata | null> {
  const userId = await getAuthenticatedUserId()
  const [application] = await db
    .select({
      jobOfferLink: jobApplications.jobOfferLink,
    })
    .from(jobApplications)
    .where(and(eq(jobApplications.id, id), eq(jobApplications.userId, userId)))
    .limit(1)

  if (!application) return null

  try {
    return await syncApplicationMetadata(userId, id, application.jobOfferLink)
  } catch (error) {
    console.error("Failed to refresh application metadata on demand", error)
    return null
  }
}

export async function fetchApplicationMetadata(
  id: string
): Promise<JobApplicationMetadata | null> {
  const userId = await getAuthenticatedUserId()
  return fetchApplicationMetadataForUserApplication(userId, id)
}

export async function updateDeeperSearchPreference(enabled: boolean): Promise<{
  settings: TrackerSettings
  queuedApplications: number
}> {
  const userId = await getAuthenticatedUserId()
  const settings = await updateDeeperSearchSetting(userId, enabled)

  if (!enabled) {
    return { settings, queuedApplications: 0 }
  }

  const applications = await db
    .select({
      id: jobApplications.id,
      jobOfferLink: jobApplications.jobOfferLink,
    })
    .from(jobApplications)
    .where(eq(jobApplications.userId, userId))

  const queuedApplications = (
    await Promise.all(
      applications.map(async (application) => {
        const existingMetadata = await fetchApplicationMetadataForUserApplication(
          userId,
          application.id
        )
        if (existingMetadata) return null

        return queueApplicationMetadataSearch(
          userId,
          application.id,
          application.jobOfferLink
        )
      })
    )
  ).filter(Boolean)

  if (queuedApplications.length > 0) {
    after(async () => {
      await Promise.allSettled(
        applications.map(async (application) => {
          const existingMetadata = await fetchApplicationMetadataForUserApplication(
            userId,
            application.id
          )
          if (
            existingMetadata &&
            existingMetadata.extractionStatus !== "queued"
          ) {
            return
          }

          await runApplicationMetadataSearch(
            userId,
            application.id,
            application.jobOfferLink
          )
        })
      )
    })
  }

  return {
    settings,
    queuedApplications: queuedApplications.length,
  }
}

// ─── Options ─────────────────────────────────────────────────────────────────

export async function fetchOptions(): Promise<TrackerOptions> {
  const userId = await getAuthenticatedUserId()
  const rows = await db
    .select()
    .from(userOptions)
    .where(eq(userOptions.userId, userId))
    .orderBy(userOptions.sortOrder)

  const empty: TrackerOptions = {
    cvUsed: [],
    emailUsed: [],
    status: [],
    finalStatus: [],
  }

  return rows.reduce((acc, row) => {
    const category = row.category as OptionCategory
    if (!acc[category]) return acc
    acc[category].push({
      id: row.id,
      value: row.value,
      color: row.color,
      sortOrder: row.sortOrder,
    })
    return acc
  }, empty)
}

export async function addOption(
  category: OptionCategory,
  value: string,
  color: string
): Promise<UserOption> {
  const userId = await getAuthenticatedUserId()
  const existingInCategory = await db
    .select({ sortOrder: userOptions.sortOrder })
    .from(userOptions)
    .where(
      and(
        eq(userOptions.userId, userId),
        eq(userOptions.category, category)
      )
    )
  const nextSortOrder = existingInCategory.length

  const [row] = await db
    .insert(userOptions)
    .values({ userId, category, value: value.trim(), color, sortOrder: nextSortOrder })
    .returning()

  return {
    id: row.id,
    value: row.value,
    color: row.color,
    sortOrder: row.sortOrder,
  }
}

export async function renameOption(
  optionId: string,
  newValue: string,
  newColor: string
): Promise<void> {
  const userId = await getAuthenticatedUserId()

  const [existing] = await db
    .select()
    .from(userOptions)
    .where(
      and(eq(userOptions.id, optionId), eq(userOptions.userId, userId))
    )
  if (!existing) return

  const trimmed = newValue.trim()

  await db.transaction(async (tx) => {
    await tx
      .update(userOptions)
      .set({ value: trimmed, color: newColor })
      .where(eq(userOptions.id, optionId))

    const field = CATEGORY_TO_APP_FIELD[existing.category as OptionCategory]
    if (field) {
      await tx
        .update(jobApplications)
        .set({ [field]: trimmed, updatedAt: new Date() })
        .where(
          and(
            eq(jobApplications.userId, userId),
            eq(jobApplications[field], existing.value)
          )
        )
    }
  })
}

export async function deleteOption(optionId: string): Promise<string> {
  const userId = await getAuthenticatedUserId()

  const [existing] = await db
    .select()
    .from(userOptions)
    .where(
      and(eq(userOptions.id, optionId), eq(userOptions.userId, userId))
    )
  if (!existing) return ""

  const siblings = await db
    .select()
    .from(userOptions)
    .where(
      and(
        eq(userOptions.userId, userId),
        eq(userOptions.category, existing.category)
      )
    )
    .orderBy(userOptions.sortOrder)

  if (siblings.length <= 1) return ""

  const fallback = siblings.find((s) => s.id !== optionId)!

  await db.transaction(async (tx) => {
    await tx.delete(userOptions).where(eq(userOptions.id, optionId))

    const field = CATEGORY_TO_APP_FIELD[existing.category as OptionCategory]
    if (field) {
      await tx
        .update(jobApplications)
        .set({ [field]: fallback.value, updatedAt: new Date() })
        .where(
          and(
            eq(jobApplications.userId, userId),
            eq(jobApplications[field], existing.value)
          )
        )
    }
  })

  return fallback.value
}

// ─── Seed ─────────────────────────────────────────────────────────────────────

export async function seedDefaultOptionsIfNeeded(
  userEmail: string
): Promise<boolean> {
  const userId = await getAuthenticatedUserId()

  const existing = await db
    .select({ id: userOptions.id })
    .from(userOptions)
    .where(eq(userOptions.userId, userId))
    .limit(1)

  if (existing.length > 0) return false

  await db.insert(userOptions).values([
    { userId, category: "cvUsed",      value: "RESUME v1",  color: "zinc",    sortOrder: 0 },
    { userId, category: "emailUsed",   value: userEmail,    color: "sky",     sortOrder: 0 },
    { userId, category: "status",      value: "APPLIED",    color: "sky",     sortOrder: 0 },
    { userId, category: "status",      value: "DENIED",     color: "red",     sortOrder: 1 },
    { userId, category: "status",      value: "INTERVIEW",  color: "emerald", sortOrder: 2 },
    { userId, category: "finalStatus", value: "DENIED",     color: "red",     sortOrder: 0 },
    { userId, category: "finalStatus", value: "OFFER",      color: "emerald", sortOrder: 1 },
  ])

  return true
}

// ─── Import ───────────────────────────────────────────────────────────────────

export interface ParsedImportRow {
  companyName: string
  jobPosition: string
  dateOfApplication: string
  jobOfferLink: string
  cvUsed: string
  emailUsed: string
  status: string
  finalStatus: string
}

export interface ImportResult {
  insertedApplications: Array<ParsedImportRow & { id: string }>
  insertedOptions: Array<{ category: OptionCategory; option: UserOption }>
  skipped: number
}

export async function importApplications(
  rows: ParsedImportRow[]
): Promise<ImportResult> {
  const userId = await getAuthenticatedUserId()
  const settings = await fetchTrackerSettingsByUser(userId)

  // ── 1. Collect all unique option values from the import ──────────────────
  const optionCategories: OptionCategory[] = ["cvUsed", "emailUsed", "status", "finalStatus"]
  const newValuesPerCategory = new Map<OptionCategory, Set<string>>()
  for (const cat of optionCategories) newValuesPerCategory.set(cat, new Set())

  for (const row of rows) {
    if (row.cvUsed.trim())      newValuesPerCategory.get("cvUsed")!.add(row.cvUsed.trim())
    if (row.emailUsed.trim())   newValuesPerCategory.get("emailUsed")!.add(row.emailUsed.trim())
    if (row.status.trim())      newValuesPerCategory.get("status")!.add(row.status.trim())
    if (row.finalStatus.trim()) newValuesPerCategory.get("finalStatus")!.add(row.finalStatus.trim())
  }

  // ── 2. Load existing options to find what's new ───────────────────────────
  const existingOptions = await db
    .select()
    .from(userOptions)
    .where(eq(userOptions.userId, userId))
    .orderBy(userOptions.sortOrder)

  const existingByCategory = new Map<OptionCategory, Set<string>>()
  for (const cat of optionCategories) existingByCategory.set(cat, new Set())
  for (const opt of existingOptions) {
    existingByCategory.get(opt.category as OptionCategory)?.add(opt.value)
  }

  // ── 3. Insert new option values ───────────────────────────────────────────
  const insertedOptions: ImportResult["insertedOptions"] = []

  for (const cat of optionCategories) {
    const existingValues = existingByCategory.get(cat)!
    const existingCount = existingOptions.filter((o) => o.category === cat).length
    let sortOffset = existingCount

    for (const value of newValuesPerCategory.get(cat)!) {
      if (existingValues.has(value)) continue

      const [row] = await db
        .insert(userOptions)
        .values({ userId, category: cat, value, color: "zinc", sortOrder: sortOffset++ })
        .onConflictDoNothing()
        .returning()

      if (row) {
        insertedOptions.push({
          category: cat,
          option: {
            id: row.id,
            value: row.value,
            color: row.color,
            sortOrder: row.sortOrder,
          },
        })
        existingValues.add(value)
      }
    }
  }

  // ── 4. Deduplicate: load existing (company, position, date) tuples ────────
  const existingApps = await db
    .select({
      companyName: jobApplications.companyName,
      jobPosition: jobApplications.jobPosition,
      dateOfApplication: jobApplications.dateOfApplication,
    })
    .from(jobApplications)
    .where(eq(jobApplications.userId, userId))

  const existingKeys = new Set(
    existingApps.map(
      (a) => `${a.companyName}||${a.jobPosition}||${a.dateOfApplication}`
    )
  )

  // ── 5. Insert non-duplicate rows ──────────────────────────────────────────
  const toInsert = rows.filter(
    (r) =>
      !existingKeys.has(
        `${r.companyName.trim()}||${r.jobPosition.trim()}||${r.dateOfApplication}`
      )
  )

  const skipped = rows.length - toInsert.length
  const insertedApplications: ImportResult["insertedApplications"] = []

  if (toInsert.length > 0) {
    const inserted = await db
      .insert(jobApplications)
      .values(
        toInsert.map((r) => ({
          userId,
          companyName: r.companyName.trim(),
          jobPosition: r.jobPosition.trim(),
          dateOfApplication: r.dateOfApplication,
          jobOfferLink: r.jobOfferLink.trim(),
          cvUsed: r.cvUsed.trim(),
          emailUsed: r.emailUsed.trim(),
          status: r.status.trim(),
          finalStatus: r.finalStatus.trim(),
        }))
      )
      .returning()

    for (const row of inserted) {
      insertedApplications.push({
        id: row.id,
        companyName: row.companyName,
        jobPosition: row.jobPosition,
        dateOfApplication: row.dateOfApplication,
        jobOfferLink: row.jobOfferLink,
        cvUsed: row.cvUsed,
        emailUsed: row.emailUsed,
        status: row.status,
        finalStatus: row.finalStatus,
      })
    }

    if (settings.deeperSearchEnabled) {
      await Promise.all(
        insertedApplications.map((application) =>
          queueApplicationMetadataSearch(
            userId,
            application.id,
            application.jobOfferLink
          )
        )
      )

      after(async () => {
        await Promise.allSettled(
          insertedApplications.map((application) =>
            runApplicationMetadataSearch(
              userId,
              application.id,
              application.jobOfferLink
            )
          )
        )
      })
    }
  }

  return { insertedApplications, insertedOptions, skipped }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const CATEGORY_TO_APP_FIELD: Record<OptionCategory, ApplicationFieldKey> = {
  cvUsed: "cvUsed",
  emailUsed: "emailUsed",
  status: "status",
  finalStatus: "finalStatus",
}
