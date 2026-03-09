import { Metadata } from "next"

import { getTrackerData } from "@/app/app/_lib/get-tracker-data"
import { SettingsPage } from "@/components/job-tracker/settings-page"

export const metadata: Metadata = {
  title: "Settings | Job Tracker",
  description: "Track your job applications and get insights on your job search",
}

export default async function SettingsRoutePage() {
  const { applications, options } = await getTrackerData()
  return (
    <SettingsPage
      initialApplications={applications}
      initialOptions={options}
    />
  )
}
