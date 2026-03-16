import type {
  AnalysisOverview,
  FlowLink,
  FlowNode,
} from "@/lib/job-tracker/analysis"

import {
  describeFlowPath,
  percentOf,
} from "@/components/job-tracker/analysis/chart-helpers"
import { AnalysisCard } from "@/components/job-tracker/analysis/analysis-card"

interface ApplicationFlowCardProps {
  overview: AnalysisOverview
  flowNodes: FlowNode[]
  flowLinks: FlowLink[]
  className?: string
}

export function ApplicationFlowCard({
  overview,
  flowNodes,
  flowLinks,
  className,
}: ApplicationFlowCardProps) {
  const flowWidth = 1080
  const flowHeight = 500
  const flowNodeWidth = 186
  const flowNodeHeight = 72
  const maxFlowValue = Math.max(
    ...flowLinks.map((link) => link.value),
    overview.totalApplications,
    1
  )

  return (
    <AnalysisCard
      title="Application flow"
      description="Flow from total applications to not applied yet, no response, responses, and outcomes."
      className={className}
    >
      <div className="mt-4 overflow-x-auto">
        <svg
          viewBox={`0 0 ${flowWidth} ${flowHeight}`}
          className="h-[320px] min-w-[760px] w-full md:h-[400px] md:min-w-[1020px]"
          role="img"
          aria-label="Application flow diagram"
        >
          {flowLinks.map((link) => {
            if (link.value <= 0) {
              return null
            }

            const startX = link.from.x + flowNodeWidth
            const startY = link.from.y + flowNodeHeight / 2
            const endX = link.to.x
            const endY = link.to.y + flowNodeHeight / 2
            const strokeWidth = Math.max((link.value / maxFlowValue) * 38, 7)

            return (
              <path
                key={link.key}
                d={describeFlowPath(startX, startY, endX, endY)}
                stroke={link.color}
                strokeOpacity="0.5"
                strokeWidth={strokeWidth}
                fill="none"
                strokeLinecap="round"
                className="transition-all duration-200 hover:stroke-opacity-80"
              />
            )
          })}

          {flowNodes.map((node) => (
            <g key={node.key}>
              <rect
                x={node.x}
                y={node.y}
                width={flowNodeWidth}
                height={flowNodeHeight}
                rx="16"
                fill={node.color}
                fillOpacity="0.12"
                stroke={node.color}
                strokeOpacity="0.5"
              />
              <text
                x={node.x + 14}
                y={node.y + 24}
                className="fill-zinc-700 text-[11px] font-semibold uppercase tracking-wide dark:fill-zinc-200"
              >
                {node.label}
              </text>
              <text
                x={node.x + 14}
                y={node.y + 49}
                className="fill-zinc-900 text-[22px] font-bold dark:fill-zinc-100"
              >
                {node.value}
              </text>
              <text
                x={node.x + flowNodeWidth - 14}
                y={node.y + 49}
                textAnchor="end"
                className="fill-zinc-500 text-[11px] font-medium dark:fill-zinc-300"
              >
                {node.key === "applications"
                  ? "100%"
                  : percentOf(node.value, overview.totalApplications)}
              </text>
            </g>
          ))}
        </svg>
      </div>
    </AnalysisCard>
  )
}
