import { Metadata } from "next"

import { getTrackerData } from "@/app/app/_lib/get-tracker-data"
import { ApplicationsPage } from "@/components/job-tracker/applications-page"

export const metadata: Metadata = {
  title: "Applications | Job Tracker",
  description: "Track your job applications and get insights on your job search",
}

export default async function AppPage() {
  const { applications, options } = await getTrackerData()
  return <ApplicationsPage initialApplications={applications} initialOptions={options} />
}
