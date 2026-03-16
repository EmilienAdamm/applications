import type { AnalysisOverview } from "@/lib/job-tracker/analysis"

import { formatRatioPercent } from "@/components/job-tracker/analysis/chart-helpers"
import { MetricCard } from "@/components/job-tracker/analysis/metric-card"

interface OverviewMetricsProps {
  overview: AnalysisOverview
}

export function OverviewMetrics({ overview }: OverviewMetricsProps) {
  const { totalApplications } = overview

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
      <MetricCard
        label="Applications"
        value={overview.totalApplications}
        hoverToneClassName="hover:bg-zinc-50 dark:hover:bg-zinc-800/80"
      />
      <MetricCard
        label="No response"
        value={overview.noResponseCount}
        percentage={formatRatioPercent(overview.noResponseCount, totalApplications)}
        percentageToneClassName="text-amber-600 dark:text-amber-400"
        hoverToneClassName="hover:bg-amber-50 dark:hover:bg-amber-950/20"
      />
      <MetricCard
        label="Active (not denied / offer)"
        value={overview.activeCount}
        percentage={formatRatioPercent(overview.activeCount, totalApplications)}
        percentageToneClassName="text-emerald-600 dark:text-emerald-400"
        hoverToneClassName="hover:bg-emerald-50 dark:hover:bg-emerald-950/20"
      />
      <MetricCard
        label="Interview stages"
        value={overview.interviewCount}
        percentage={formatRatioPercent(overview.interviewCount, totalApplications)}
        percentageToneClassName="text-sky-600 dark:text-sky-400"
        hoverToneClassName="hover:bg-sky-50 dark:hover:bg-sky-950/20"
      />
      <MetricCard
        label="Rejections"
        value={overview.rejectionCount}
        percentage={formatRatioPercent(overview.rejectionCount, totalApplications)}
        percentageToneClassName="text-rose-600 dark:text-rose-400"
        hoverToneClassName="hover:bg-rose-50 dark:hover:bg-rose-950/20"
      />
    </div>
  )
}
