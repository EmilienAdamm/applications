import type { SkillCount } from "@/lib/job-tracker/analysis"

import { shortSkillLabel } from "@/components/job-tracker/analysis/chart-helpers"
import { AnalysisCard } from "@/components/job-tracker/analysis/analysis-card"

interface RequestedTechnologiesCardProps {
  topSkills: SkillCount[]
}

export function RequestedTechnologiesCard({
  topSkills,
}: RequestedTechnologiesCardProps) {
  const maxSkillCount = Math.max(...topSkills.map((item) => item.count), 1)
  const skillChartHeight = 340
  const skillChartPaddingTop = 18
  const skillChartPaddingLeft = 38
  const skillChartPaddingRight = 12
  const skillChartPaddingBottom = 78
  const skillChartInnerHeight =
    skillChartHeight - skillChartPaddingTop - skillChartPaddingBottom
  const skillBarWidth = 32
  const skillBarGap = 14
  const skillChartWidth = Math.max(
    440,
    skillChartPaddingLeft +
      skillChartPaddingRight +
      topSkills.length * skillBarWidth +
      Math.max(topSkills.length - 1, 0) * skillBarGap
  )

  return (
    <AnalysisCard
      title="Most requested technologies"
      description="Frequency of technologies detected in fetched job-post metadata."
    >
      {topSkills.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">
          No skill metadata available yet.
        </p>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <svg
            viewBox={`0 0 ${skillChartWidth} ${skillChartHeight}`}
            className="h-[300px] min-w-[440px] w-full md:h-[340px]"
            role="img"
            aria-label="Most requested technologies bar chart"
          >
            {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
              const y = skillChartPaddingTop + (1 - ratio) * skillChartInnerHeight
              const value = Math.round(ratio * maxSkillCount)

              return (
                <g key={ratio}>
                  <line
                    x1={skillChartPaddingLeft}
                    y1={y}
                    x2={skillChartWidth - skillChartPaddingRight}
                    y2={y}
                    stroke="currentColor"
                    className="text-zinc-300/70 dark:text-zinc-700/60"
                    strokeWidth="1"
                  />
                  <text
                    x={skillChartPaddingLeft - 8}
                    y={y + 4}
                    textAnchor="end"
                    className="fill-zinc-500 text-[10px]"
                  >
                    {value}
                  </text>
                </g>
              )
            })}

            <line
              x1={skillChartPaddingLeft}
              y1={skillChartPaddingTop}
              x2={skillChartPaddingLeft}
              y2={skillChartHeight - skillChartPaddingBottom}
              stroke="currentColor"
              className="text-zinc-400 dark:text-zinc-600"
              strokeWidth="1.2"
            />
            <line
              x1={skillChartPaddingLeft}
              y1={skillChartHeight - skillChartPaddingBottom}
              x2={skillChartWidth - skillChartPaddingRight}
              y2={skillChartHeight - skillChartPaddingBottom}
              stroke="currentColor"
              className="text-zinc-400 dark:text-zinc-600"
              strokeWidth="1.2"
            />

            {topSkills.map((item, index) => {
              const x = skillChartPaddingLeft + index * (skillBarWidth + skillBarGap)
              const barHeight = (item.count / maxSkillCount) * skillChartInnerHeight
              const y = skillChartHeight - skillChartPaddingBottom - barHeight

              return (
                <g key={item.label}>
                  <rect
                    x={x}
                    y={y}
                    width={skillBarWidth}
                    height={barHeight}
                    rx="4"
                    fill="#38bdf8"
                    fillOpacity="0.7"
                    stroke="#0ea5e9"
                    strokeWidth="1"
                  >
                    <title>{`${item.label}: ${item.count}`}</title>
                  </rect>
                  <text
                    x={x + skillBarWidth / 2}
                    y={y - 8}
                    textAnchor="middle"
                    className="fill-zinc-700 text-[10px] font-medium dark:fill-zinc-200"
                  >
                    {item.count}
                  </text>
                  <text
                    x={x + skillBarWidth / 2}
                    y={skillChartHeight - skillChartPaddingBottom + 12}
                    textAnchor="end"
                    transform={`rotate(-35 ${x + skillBarWidth / 2} ${skillChartHeight - skillChartPaddingBottom + 12})`}
                    className="fill-zinc-600 text-[10px] dark:fill-zinc-300"
                  >
                    {shortSkillLabel(item.label)}
                  </text>
                </g>
              )
            })}

            <text
              x={skillChartPaddingLeft - 28}
              y={skillChartHeight / 2}
              textAnchor="middle"
              transform={`rotate(-90 ${skillChartPaddingLeft - 28} ${skillChartHeight / 2})`}
              className="fill-zinc-600 text-[11px] dark:fill-zinc-300"
            >
              Job posts
            </text>
          </svg>
        </div>
      )}
    </AnalysisCard>
  )
}
