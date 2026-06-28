import "server-only"

import { eq, sql } from "drizzle-orm"

import { db } from "@/lib/db"
import { trackerUserSettings } from "@/lib/db/schema"
import type { TrackerSettings } from "@/lib/job-tracker/types"

let trackerSettingsStorageReady: Promise<void> | null = null

function mapTrackerSettings(
  row: typeof trackerUserSettings.$inferSelect | undefined
): TrackerSettings {
  return {
    deeperSearchEnabled: row?.deeperSearchEnabled ?? false,
    automaticFetchEnabled: row?.automaticFetchEnabled ?? false,
  }
}

export async function ensureTrackerSettingsStorage() {
  if (trackerSettingsStorageReady) {
    await trackerSettingsStorageReady
    return
  }

  trackerSettingsStorageReady = (async () => {
    await db.execute(sql`
      create table if not exists tracker_user_settings (
        user_id text primary key,
        dipper_search_enabled boolean not null default false,
        automatic_fetch_enabled boolean not null default false,
        created_at timestamptz not null default now(),
        updated_at timestamptz not null default now()
      )
    `)

    await db.execute(sql`
      alter table tracker_user_settings
      add column if not exists automatic_fetch_enabled boolean not null default false
    `)
  })()

  await trackerSettingsStorageReady
}

export async function fetchTrackerSettingsByUser(
  userId: string
): Promise<TrackerSettings> {
  await ensureTrackerSettingsStorage()

  const [row] = await db
    .select()
    .from(trackerUserSettings)
    .where(eq(trackerUserSettings.userId, userId))
    .limit(1)

  return mapTrackerSettings(row)
}

export async function updateDeeperSearchSetting(
  userId: string,
  enabled: boolean
): Promise<TrackerSettings> {
  await ensureTrackerSettingsStorage()

  await db
    .insert(trackerUserSettings)
    .values({
      userId,
      deeperSearchEnabled: enabled,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: trackerUserSettings.userId,
      set: {
        deeperSearchEnabled: enabled,
        updatedAt: new Date(),
      },
    })

  return fetchTrackerSettingsByUser(userId)
}

export async function updateAutomaticFetchSetting(
  userId: string,
  enabled: boolean
): Promise<TrackerSettings> {
  await ensureTrackerSettingsStorage()

  await db
    .insert(trackerUserSettings)
    .values({
      userId,
      automaticFetchEnabled: enabled,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: trackerUserSettings.userId,
      set: {
        automaticFetchEnabled: enabled,
        updatedAt: new Date(),
      },
    })

  return fetchTrackerSettingsByUser(userId)
}
