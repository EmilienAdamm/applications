import { Metadata } from "next"

import { getSettingsPageData } from "@/app/app/_lib/get-tracker-data"
import { SettingsPage } from "@/components/job-tracker/settings-page"

export const metadata: Metadata = {
  title: "Settings | Job Tracker",
  description: "Track your job applications and get insights on your job search",
}

export default async function SettingsRoutePage() {
  const { options, settings } = await getSettingsPageData()
  return <SettingsPage initialOptions={options} initialSettings={settings} />
}
