import type { CountByLabel } from "@/lib/job-tracker/analysis"

import { AnalysisCard } from "@/components/job-tracker/analysis/analysis-card"

interface TopCompaniesCardProps {
  companyBars: CountByLabel[]
}

export function TopCompaniesCard({ companyBars }: TopCompaniesCardProps) {
  const maxBarCount = Math.max(...companyBars.map((item) => item.count), 1)

  return (
    <AnalysisCard
      title="Top companies applied to"
      description="Top 10 + Other when there are many companies."
      className="xl:col-span-2"
    >
      <div className="mt-4 space-y-3">
        {companyBars.length === 0 ? (
          <p className="text-sm text-muted-foreground">No data available.</p>
        ) : (
          companyBars.map((item) => (
            <div
              key={item.label}
              className="group grid grid-cols-[132px_1fr_36px] items-center gap-2 rounded-lg px-2 py-1 transition-colors duration-200 hover:bg-emerald-50/70 sm:grid-cols-[180px_1fr_40px] sm:gap-3 dark:hover:bg-emerald-950/20"
            >
              <p className="truncate text-sm font-medium">{item.label}</p>
              <div className="h-2.5 rounded-full bg-zinc-200 dark:bg-zinc-800">
                <div
                  className="h-full rounded-full bg-emerald-500 transition-[width,background-color] duration-300 group-hover:bg-cyan-500"
                  style={{ width: `${(item.count / maxBarCount) * 100}%` }}
                />
              </div>
              <p className="text-right text-sm font-semibold">{item.count}</p>
            </div>
          ))
        )}
      </div>
    </AnalysisCard>
  )
}
