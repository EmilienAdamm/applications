import { Metadata } from "next"

import { getAnalysisPageData } from "@/app/app/_lib/get-tracker-data"
import { AnalysisPage } from "@/components/job-tracker/analysis-page"

export const metadata: Metadata = {
  title: "Analysis | Job Tracker",
  description: "Track your job applications and get insights on your job search",
}

export default async function AnalysisRoutePage() {
  const { applications } = await getAnalysisPageData()
  return <AnalysisPage applications={applications} />
}
