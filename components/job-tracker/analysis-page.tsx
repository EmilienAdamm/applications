"use client"

import dynamic from "next/dynamic"
import type { JobApplication } from "@/lib/job-tracker/types"

const AnalysisTab = dynamic(
  () =>
    import("@/components/job-tracker/analysis-tab").then((module) => ({
      default: module.AnalysisTab,
    })),
  {
    loading: () => (
      <div className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <div className="h-28 animate-pulse rounded-2xl bg-zinc-200/80 dark:bg-zinc-800/80" />
          <div className="h-28 animate-pulse rounded-2xl bg-zinc-200/80 dark:bg-zinc-800/80" />
          <div className="h-28 animate-pulse rounded-2xl bg-zinc-200/80 dark:bg-zinc-800/80" />
          <div className="h-28 animate-pulse rounded-2xl bg-zinc-200/80 dark:bg-zinc-800/80" />
          <div className="h-28 animate-pulse rounded-2xl bg-zinc-200/80 dark:bg-zinc-800/80" />
        </div>
        <div className="h-96 animate-pulse rounded-2xl bg-zinc-200/80 dark:bg-zinc-800/80" />
      </div>
    ),
  }
)

interface AnalysisPageProps {
  applications: JobApplication[]
}

export function AnalysisPage({ applications }: AnalysisPageProps) {
  return <AnalysisTab applications={applications} />
}
