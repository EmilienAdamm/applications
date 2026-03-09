"use client"

import { AnalysisTab } from "@/components/job-tracker/analysis-tab"
import { AppShell } from "@/components/job-tracker/app-shell"
import type { JobApplication } from "@/lib/job-tracker/types"

interface AnalysisPageProps {
  applications: JobApplication[]
}

export function AnalysisPage({ applications }: AnalysisPageProps) {
  return (
    <AppShell activeTab="analysis">
      <AnalysisTab applications={applications} />
    </AppShell>
  )
}
