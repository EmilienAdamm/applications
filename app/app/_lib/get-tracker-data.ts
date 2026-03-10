import { cache } from "react"

import { asc, eq } from "drizzle-orm"
import { headers } from "next/headers"
import { redirect } from "next/navigation"

import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { jobApplications, userOptions } from "@/lib/db/schema"
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

  if (existing.length > 0) return

  await db.insert(userOptions).values([
    { userId, category: "cvUsed", value: "RESUME v1", color: "zinc", sortOrder: 0 },
    { userId, category: "emailUsed", value: userEmail, color: "sky", sortOrder: 0 },
    { userId, category: "status", value: "APPLIED", color: "sky", sortOrder: 0 },
    { userId, category: "status", value: "DENIED", color: "red", sortOrder: 1 },
    { userId, category: "status", value: "INTERVIEW", color: "emerald", sortOrder: 2 },
    { userId, category: "finalStatus", value: "DENIED", color: "red", sortOrder: 0 },
    { userId, category: "finalStatus", value: "OFFER", color: "emerald", sortOrder: 1 },
  ])
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

  const [applications, options] = await Promise.all([
    fetchApplicationsByUser(user.id),
    fetchOptionsByUser(user.id),
  ])

  return { applications, options }
}

export async function getAnalysisPageData() {
  const user = await requireTrackerUser()
  return { applications: await fetchApplicationsByUser(user.id) }
}

export async function getSettingsPageData() {
  const user = await requireTrackerUser()
  await ensureDefaultOptions(user.id, user.email ?? "")

  return { options: await fetchOptionsByUser(user.id) }
}
