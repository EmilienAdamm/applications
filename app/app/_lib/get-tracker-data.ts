import { headers } from "next/headers"
import { redirect } from "next/navigation"

import {
  fetchApplications,
  fetchOptions,
  seedDefaultOptionsIfNeeded,
} from "@/app/app/actions"
import { auth } from "@/lib/auth"

export async function getTrackerData() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) redirect("/login")

  await seedDefaultOptionsIfNeeded(session.user.email)

  const [applications, options] = await Promise.all([
    fetchApplications(),
    fetchOptions(),
  ])

  return { applications, options }
}
