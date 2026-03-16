"use client"

import { useState } from "react"

import type { DailySeriesPoint } from "@/lib/job-tracker/analysis"

import {
  dateLabel,
} from "@/components/job-tracker/analysis/chart-helpers"
import { AnalysisCard } from "@/components/job-tracker/analysis/analysis-card"

interface ApplicationsByDayCardProps {
  dailySeries: DailySeriesPoint[]
}

export function ApplicationsByDayCard({
  dailySeries,
}: ApplicationsByDayCardProps) {
  const [hoveredDayPoint, setHoveredDayPoint] = useState<{
    date: string
    count: number
    x: number
    y: number
  } | null>(null)

  const chartWidth = 860
  const chartHeight = 300
  const chartPaddingX = 28
  const chartPaddingY = 24
  const maxDailyCount = Math.max(...dailySeries.map((item) => item.count), 1)
  const points = dailySeries.map((item, index) => {
    const x =
      dailySeries.length === 1
        ? chartWidth / 2
        : chartPaddingX +
          (index * (chartWidth - chartPaddingX * 2)) / (dailySeries.length - 1)
    const y =
      chartHeight -
      chartPaddingY -
      (item.count / maxDailyCount) * (chartHeight - chartPaddingY * 2)

    return { ...item, x, y }
  })
  const linePoints = points.map((point) => `${point.x},${point.y}`).join(" ")
  const lineTickStep = Math.max(1, Math.ceil(dailySeries.length / 6))
  const tooltipWidth = 136
  const tooltipHeight = 50
  const tooltipX = hoveredDayPoint
    ? Math.min(
        chartWidth - chartPaddingX - tooltipWidth,
        Math.max(chartPaddingX, hoveredDayPoint.x - tooltipWidth / 2)
      )
    : 0
  const tooltipY = hoveredDayPoint
    ? Math.max(6, hoveredDayPoint.y - tooltipHeight - 14)
    : 0

  return (
    <AnalysisCard
      title="Applications by day"
      description="Number of applications for each application day."
    >
      {dailySeries.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">No date data available.</p>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <svg
            viewBox={`0 0 ${chartWidth} ${chartHeight}`}
            className="h-[280px] min-w-[620px] w-full md:h-[340px] md:min-w-[780px]"
            role="img"
            aria-label="Applications per day line chart"
          >
            {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
              const y =
                chartHeight -
                chartPaddingY -
                ratio * (chartHeight - chartPaddingY * 2)
              const value = Math.round(ratio * maxDailyCount)

              return (
                <g key={ratio}>
                  <line
                    x1={chartPaddingX}
                    y1={y}
                    x2={chartWidth - chartPaddingX}
                    y2={y}
                    stroke="currentColor"
                    className="text-zinc-300/70 dark:text-zinc-700/60"
                    strokeWidth="1"
                  />
                  <text
                    x={chartPaddingX - 8}
                    y={y + 4}
                    textAnchor="end"
                    className="fill-zinc-500 text-[10px]"
                  >
                    {value}
                  </text>
                </g>
              )
            })}

            <polyline
              fill="none"
              points={linePoints}
              stroke="#10b981"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {points.map((point, index) => (
              <g key={point.date}>
                <circle
                  cx={point.x}
                  cy={point.y}
                  r={hoveredDayPoint?.date === point.date ? 6.5 : 5}
                  fill="#10b981"
                  className="cursor-pointer transition-all duration-150"
                  onMouseEnter={() =>
                    setHoveredDayPoint({
                      date: point.date,
                      count: point.count,
                      x: point.x,
                      y: point.y,
                    })
                  }
                  onMouseLeave={() =>
                    setHoveredDayPoint((current) =>
                      current?.date === point.date ? null : current
                    )
                  }
                >
                  <title>{`${dateLabel(point.date)}: ${point.count} applications`}</title>
                </circle>
                {(index % lineTickStep === 0 || index === points.length - 1) && (
                  <text
                    x={point.x}
                    y={chartHeight - 4}
                    textAnchor="middle"
                    className="fill-zinc-500 text-[10px]"
                  >
                    {dateLabel(point.date)}
                  </text>
                )}
              </g>
            ))}

            {hoveredDayPoint ? (
              <g pointerEvents="none">
                <line
                  x1={hoveredDayPoint.x}
                  y1={chartPaddingY}
                  x2={hoveredDayPoint.x}
                  y2={chartHeight - chartPaddingY}
                  stroke="#14b8a6"
                  strokeOpacity="0.35"
                  strokeWidth="1.2"
                  strokeDasharray="4 4"
                />
                <rect
                  x={tooltipX}
                  y={tooltipY}
                  width={tooltipWidth}
                  height={tooltipHeight}
                  rx="8"
                  className="fill-white/95 stroke-zinc-300 dark:fill-zinc-900/95 dark:stroke-zinc-700"
                />
                <text
                  x={tooltipX + 10}
                  y={tooltipY + 20}
                  className="fill-zinc-900 text-[12px] font-semibold dark:fill-zinc-100"
                >
                  {hoveredDayPoint.count} applications
                </text>
                <text
                  x={tooltipX + 10}
                  y={tooltipY + 35}
                  className="fill-zinc-500 text-[10px] dark:fill-zinc-300"
                >
                  {dateLabel(hoveredDayPoint.date)}
                </text>
              </g>
            ) : null}
          </svg>
        </div>
      )}
    </AnalysisCard>
  )
}
