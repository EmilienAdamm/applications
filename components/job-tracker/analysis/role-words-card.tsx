"use client"

import { useState, type CSSProperties } from "react"

import type { BubbleLayout } from "@/lib/job-tracker/analysis"

import {
  getBubbleFontSize,
  getRepelledBubbleOffset,
} from "@/components/job-tracker/analysis/chart-helpers"
import { AnalysisCard } from "@/components/job-tracker/analysis/analysis-card"

interface RoleWordsCardProps {
  bubbleLayout: BubbleLayout
}

export function RoleWordsCard({ bubbleLayout }: RoleWordsCardProps) {
  const [bubbleCursor, setBubbleCursor] = useState<{ x: number; y: number } | null>(
    null
  )

  return (
    <AnalysisCard
      title="Most frequent role words"
      description="Bubble view of recurring words in job position titles."
      className="xl:col-span-3"
    >
      {bubbleLayout.bubbles.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">No position text available.</p>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <svg
            viewBox={`0 0 ${bubbleLayout.width} ${bubbleLayout.height}`}
            className="h-[380px] min-w-[680px] w-full md:h-[620px] md:min-w-[1100px]"
            role="img"
            aria-label="Most frequent role words bubble chart"
            onMouseMove={(event) => {
              const rect = event.currentTarget.getBoundingClientRect()
              const x =
                ((event.clientX - rect.left) / rect.width) * bubbleLayout.width
              const y =
                ((event.clientY - rect.top) / rect.height) * bubbleLayout.height
              setBubbleCursor({ x, y })
            }}
            onMouseLeave={() => setBubbleCursor(null)}
          >
            {bubbleLayout.bubbles.map((bubble, index) => {
              const offset = getRepelledBubbleOffset(
                bubble,
                bubbleCursor,
                index,
                bubbleLayout.width,
                bubbleLayout.height
              )
              const titleSize = getBubbleFontSize(bubble.radius)

              return (
                <g
                  key={bubble.word}
                  transform={`translate(${offset.dx} ${offset.dy})`}
                  className="transition-transform duration-150 ease-out"
                >
                  <circle
                    cx={bubble.x}
                    cy={bubble.y}
                    r={bubble.radius}
                    fill={bubble.color}
                    stroke="white"
                    strokeWidth="2"
                  />
                  <text
                    x={bubble.x}
                    y={bubble.y - 4}
                    textAnchor="middle"
                    style={{ fontSize: `${titleSize}px` } as CSSProperties}
                    fill={bubble.textColor}
                    className="font-semibold"
                  >
                    {bubble.word.replace(/_/g, " ")}
                  </text>
                  <text
                    x={bubble.x}
                    y={bubble.y + titleSize}
                    textAnchor="middle"
                    style={{
                      fontSize: `${Math.max(10, titleSize - 2)}px`,
                    } as CSSProperties}
                    fill={bubble.textColor}
                    className="opacity-80"
                  >
                    {bubble.count}
                  </text>
                </g>
              )
            })}
          </svg>
        </div>
      )}
    </AnalysisCard>
  )
}
