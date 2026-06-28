import "server-only"

import { sql } from "drizzle-orm"

import { db } from "@/lib/db"

let userOptionsStorageReady: Promise<void> | null = null

export async function ensureUserOptionsStorage() {
  if (userOptionsStorageReady) {
    await userOptionsStorageReady
    return
  }

  userOptionsStorageReady = (async () => {
    await db.execute(sql`
      alter table user_options
      add column if not exists is_favorite boolean not null default false
    `)
  })()

  await userOptionsStorageReady
}
