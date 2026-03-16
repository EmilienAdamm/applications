"use client"

import { useState } from "react"

import type { ResumeBreakdownItem } from "@/lib/job-tracker/analysis"

import {
  describeDonutSlice,
} from "@/components/job-tracker/analysis/chart-helpers"
import { AnalysisCard } from "@/components/job-tracker/analysis/analysis-card"

interface ResumeUsageCardProps {
  cvBreakdown: ResumeBreakdownItem[]
}

export function ResumeUsageCard({ cvBreakdown }: ResumeUsageCardProps) {
  const [hoveredCvLabel, setHoveredCvLabel] = useState<string | null>(null)

  const donutSize = 220
  const donutCenter = donutSize / 2
  const donutInnerRadius = 56
  const donutOuterRadius = 84
  const donutTotal = cvBreakdown.reduce((sum, item) => sum + item.count, 0)
  const hoveredCvSlice = cvBreakdown.find((item) => item.label === hoveredCvLabel)
  const isCvLegendHovered = hoveredCvLabel !== null

  const cvDonutSlices = []
  let currentCvAngle = -90
  for (const item of cvBreakdown) {
    const sweep = donutTotal === 0 ? 0 : (item.count / donutTotal) * 360
    const startAngle = currentCvAngle
    const endAngle = startAngle + sweep
    currentCvAngle = endAngle

    if (sweep <= 0) {
      continue
    }

    const isActive = hoveredCvLabel === item.label
    const outerRadius = isCvLegendHovered
      ? isActive
        ? donutOuterRadius + 10
        : donutOuterRadius - 6
      : donutOuterRadius

    cvDonutSlices.push({
      ...item,
      opacity: isCvLegendHovered && !isActive ? 0.28 : 1,
      path: describeDonutSlice(
        donutCenter,
        donutCenter,
        donutInnerRadius,
        outerRadius,
        startAngle,
        endAngle
      ),
    })
  }

  return (
    <AnalysisCard
      title="Resume usage distribution"
      description="Percentage split by resume used."
    >
      {cvBreakdown.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">No data available.</p>
      ) : (
        <div className="mt-4 space-y-4">
          <div className="relative mx-auto h-[220px] w-[220px] transition-transform duration-300 hover:scale-[1.02]">
            <svg
              viewBox={`0 0 ${donutSize} ${donutSize}`}
              className="h-full w-full drop-shadow-sm"
              role="img"
              aria-label="Resume usage donut chart"
            >
              {cvDonutSlices.map((slice) => (
                <path
                  key={slice.label}
                  d={slice.path}
                  fill={slice.color}
                  opacity={slice.opacity}
                  className="transition-all duration-200"
                />
              ))}
              <circle
                cx={donutCenter}
                cy={donutCenter}
                r={donutInnerRadius - 1}
                className="fill-white dark:fill-zinc-900"
              />
            </svg>

            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              {hoveredCvSlice ? (
                <div className="text-center">
                  <p
                    className="text-xl font-semibold"
                    style={{ color: hoveredCvSlice.color }}
                  >
                    {hoveredCvSlice.percent}%
                  </p>
                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                    {hoveredCvSlice.label}
                  </p>
                </div>
              ) : (
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  Hover legend
                </p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            {cvBreakdown.map((item) => (
              <div
                key={item.label}
                className={`flex items-center justify-between rounded-md px-2 py-1 text-xs transition-all duration-200 hover:bg-zinc-100 dark:hover:bg-zinc-800/60 ${
                  hoveredCvLabel === item.label ? "bg-zinc-100 dark:bg-zinc-800/60" : ""
                }`}
                onMouseEnter={() => setHoveredCvLabel(item.label)}
                onMouseLeave={() =>
                  setHoveredCvLabel((current) =>
                    current === item.label ? null : current
                  )
                }
              >
                <div className="flex items-center gap-2">
                  <span
                    className={`inline-block rounded-full transition-all duration-200 ${
                      hoveredCvLabel === item.label ? "h-3.5 w-3.5" : "size-2.5"
                    }`}
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="font-medium">{item.label}</span>
                </div>
                <span className="text-muted-foreground">
                  {item.count} ({item.percent}%)
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </AnalysisCard>
  )
}
