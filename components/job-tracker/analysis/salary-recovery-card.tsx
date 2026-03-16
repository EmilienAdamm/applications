import type { SalaryAverageBar } from "@/lib/job-tracker/analysis"

import {
  describeDonutSlice,
  formatSalaryAmount,
} from "@/components/job-tracker/analysis/chart-helpers"
import { AnalysisCard } from "@/components/job-tracker/analysis/analysis-card"

const SALARY_DONUT_COLORS = [
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#fb7185",
  "#0f766e",
]

interface SalaryRecoveryCardProps {
  averageSalaryBars: SalaryAverageBar[]
}

export function SalaryRecoveryCard({
  averageSalaryBars,
}: SalaryRecoveryCardProps) {
  const totalSalarySamples = averageSalaryBars.reduce(
    (sum, item) => sum + item.count,
    0
  )
  const salaryDonutSize = 176
  const salaryDonutCenter = salaryDonutSize / 2
  const salaryDonutInnerRadius = 46
  const salaryDonutOuterRadius = 70

  const salarySlices = []
  let currentSalaryAngle = -90
  for (const [index, item] of averageSalaryBars.entries()) {
    const sweep =
      totalSalarySamples === 0 ? 0 : (item.count / totalSalarySamples) * 360
    const startAngle = currentSalaryAngle
    const endAngle = startAngle + sweep
    currentSalaryAngle = endAngle

    if (sweep <= 0) {
      continue
    }

    salarySlices.push({
      ...item,
      color: SALARY_DONUT_COLORS[index % SALARY_DONUT_COLORS.length],
      path: describeDonutSlice(
        salaryDonutCenter,
        salaryDonutCenter,
        salaryDonutInnerRadius,
        salaryDonutOuterRadius,
        startAngle,
        endAngle
      ),
    })
  }

  return (
    <AnalysisCard
      title="Average recovered salary"
      description="Annualized midpoint of extracted salary ranges from Deep Search metadata."
    >
      {averageSalaryBars.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">
          No parseable salary metadata available yet.
        </p>
      ) : (
        <div className="mt-5 border-t border-zinc-200/80 pt-5 dark:border-white/10">
          <div className="flex flex-col gap-6 md:flex-row md:items-center">
            <div className="relative mx-auto shrink-0 md:mx-0">
              <svg
                viewBox={`0 0 ${salaryDonutSize} ${salaryDonutSize}`}
                className="h-40 w-40"
                role="img"
                aria-label="Recovered salary breakdown by currency"
              >
                {salarySlices.map((slice) => (
                  <path key={slice.label} d={slice.path} fill={slice.color} />
                ))}
                <circle
                  cx={salaryDonutCenter}
                  cy={salaryDonutCenter}
                  r={salaryDonutInnerRadius - 1}
                  className="fill-white dark:fill-zinc-900"
                />
              </svg>

              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <p className="text-4xl font-semibold tracking-tight">
                    {totalSalarySamples}
                  </p>
                  <p className="mt-1 text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
                    posts
                  </p>
                </div>
              </div>
            </div>

            <div className="flex-1 space-y-4">
              {salarySlices.map((item) => (
                <div key={item.label}>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span
                      className="inline-block size-2.5 rounded-full"
                      style={{ backgroundColor: item.color }}
                    />
                    <span>
                      {item.label} ({item.count} post{item.count > 1 ? "s" : ""})
                    </span>
                  </div>
                  <p className="mt-1 text-3xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
                    {formatSalaryAmount(item.average, item.currency)}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <p className="mt-5 text-[11px] text-muted-foreground">
            Monthly, weekly, daily and hourly salaries are converted to annual equivalents
            before averaging.
          </p>
        </div>
      )}
    </AnalysisCard>
  )
}
