import { cache } from "react"

import { asc, eq } from "drizzle-orm"
import { headers } from "next/headers"
import { redirect } from "next/navigation"

import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { jobApplications, userOptions } from "@/lib/db/schema"
import {
  buildDefaultUserOptions,
  DEFAULT_STATUS_VALUE,
  normalizeStatusValue,
  sortStatusOptions,
} from "@/lib/job-tracker/default-options"
import { fetchApplicationMetadataByUser } from "@/lib/job-tracker/job-application-metadata-store"
import { fetchTrackerSettingsByUser } from "@/lib/job-tracker/tracker-settings-store"
import type {
  JobApplication,
  OptionCategory,
  TrackerOptions,
} from "@/lib/job-tracker/types"

function createEmptyOptions(): TrackerOptions {
  return {
    cvUsed: [],
    emailUsed: [],
    status: [],
    finalStatus: [],
  }
}

const getTrackerSession = cache(async () => {
  return auth.api.getSession({ headers: await headers() })
})

async function requireTrackerUser() {
  const session = await getTrackerSession()
  if (!session?.user) redirect("/login")
  return session.user
}

function mapApplication(row: typeof jobApplications.$inferSelect): JobApplication {
  return {
    id: row.id,
    companyName: row.companyName,
    jobPosition: row.jobPosition,
    dateOfApplication: row.dateOfApplication,
    jobOfferLink: row.jobOfferLink,
    cvUsed: row.cvUsed,
    emailUsed: row.emailUsed,
    status: row.status,
    finalStatus: row.finalStatus,
  }
}

function mapOptions(rows: Array<typeof userOptions.$inferSelect>): TrackerOptions {
  return rows.reduce<TrackerOptions>((acc, row) => {
    const category = row.category as OptionCategory
    if (!(category in acc)) return acc

    acc[category].push({
      id: row.id,
      value: row.value,
      color: row.color,
      sortOrder: row.sortOrder,
    })

    return acc
  }, createEmptyOptions())
}

async function ensureDefaultOptions(userId: string, userEmail: string) {
  const existing = await db
    .select({ id: userOptions.id })
    .from(userOptions)
    .where(eq(userOptions.userId, userId))
    .limit(1)

  if (existing.length === 0) {
    await db.insert(userOptions).values(buildDefaultUserOptions(userId, userEmail))
    return
  }

  const statusOptions = await db
    .select()
    .from(userOptions)
    .where(eq(userOptions.userId, userId))
    .orderBy(asc(userOptions.category), asc(userOptions.sortOrder), asc(userOptions.createdAt))

  const existingStatusRows = statusOptions.filter((row) => row.category === "status")
  const hasNotAppliedYet = existingStatusRows.some(
    (row) => normalizeStatusValue(row.value) === DEFAULT_STATUS_VALUE
  )

  let nextStatusRows = existingStatusRows

  if (existingStatusRows.length === 0) {
    const insertedRows = await db
      .insert(userOptions)
      .values(
        buildDefaultUserOptions(userId, userEmail).filter(
          (row) => row.category === "status"
        )
      )
      .returning()
    nextStatusRows = insertedRows
  } else if (!hasNotAppliedYet) {
    const [insertedRow] = await db
      .insert(userOptions)
      .values({
        userId,
        category: "status",
        value: DEFAULT_STATUS_VALUE,
        color: "zinc",
        sortOrder: 0,
      })
      .returning()

    if (insertedRow) {
      nextStatusRows = [...existingStatusRows, insertedRow]
    }
  }

  const orderedStatusRows = sortStatusOptions(nextStatusRows)
  await Promise.all(
    orderedStatusRows.map((row, index) => {
      if (row.sortOrder === index) return Promise.resolve()
      return db
        .update(userOptions)
        .set({ sortOrder: index })
        .where(eq(userOptions.id, row.id))
    })
  )
}

async function fetchApplicationsByUser(userId: string) {
  const rows = await db
    .select()
    .from(jobApplications)
    .where(eq(jobApplications.userId, userId))
    .orderBy(asc(jobApplications.createdAt))

  return rows.map(mapApplication)
}

async function fetchOptionsByUser(userId: string): Promise<TrackerOptions> {
  const rows = await db
    .select()
    .from(userOptions)
    .where(eq(userOptions.userId, userId))
    .orderBy(asc(userOptions.category), asc(userOptions.sortOrder))

  if (rows.length === 0) return createEmptyOptions()

  return mapOptions(rows)
}

export async function getApplicationsPageData() {
  const user = await requireTrackerUser()
  await ensureDefaultOptions(user.id, user.email ?? "")

  const [applications, options, metadataByApplicationId] = await Promise.all([
    fetchApplicationsByUser(user.id),
    fetchOptionsByUser(user.id),
    fetchApplicationMetadataByUser(user.id),
  ])

  return { applications, options, metadataByApplicationId }
}

export async function getAnalysisPageData() {
  const user = await requireTrackerUser()
  await ensureDefaultOptions(user.id, user.email ?? "")
  return { applications: await fetchApplicationsByUser(user.id) }
}

export async function getSettingsPageData() {
  const user = await requireTrackerUser()
  await ensureDefaultOptions(user.id, user.email ?? "")

  const [options, settings] = await Promise.all([
    fetchOptionsByUser(user.id),
    fetchTrackerSettingsByUser(user.id),
  ])

  return { options, settings }
}
