import type { BubbleDatum } from "@/lib/job-tracker/analysis"

export function formatRatioPercent(value: number, total: number) {
  if (total <= 0) {
    return "0%"
  }

  const percent = (value / total) * 100
  const rounded = Number.isInteger(percent)
    ? percent.toFixed(0)
    : percent.toFixed(1)
  return `${rounded}% of total`
}

export function percentOf(value: number, total: number) {
  if (total <= 0) {
    return "0%"
  }
  return `${Math.round((value / total) * 100)}%`
}

export function formatSalaryAmount(value: number, currency: string | null) {
  if (currency) {
    try {
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency,
        maximumFractionDigits: 0,
      }).format(value)
    } catch {
      // Fall back to a generic number when Intl lacks currency support.
    }
  }

  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0,
  }).format(value)
}

export function dateLabel(date: string) {
  const value = new Date(`${date}T00:00:00`)
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(value)
}

export function shortSkillLabel(label: string) {
  if (label.length <= 12) {
    return label
  }
  return `${label.slice(0, 12)}...`
}

function polarToCartesian(
  centerX: number,
  centerY: number,
  radius: number,
  angleInDegrees: number
) {
  const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180
  return {
    x: centerX + radius * Math.cos(angleInRadians),
    y: centerY + radius * Math.sin(angleInRadians),
  }
}

export function describeDonutSlice(
  centerX: number,
  centerY: number,
  innerRadius: number,
  outerRadius: number,
  startAngle: number,
  endAngle: number
) {
  const outerStart = polarToCartesian(centerX, centerY, outerRadius, startAngle)
  const outerEnd = polarToCartesian(centerX, centerY, outerRadius, endAngle)
  const innerEnd = polarToCartesian(centerX, centerY, innerRadius, endAngle)
  const innerStart = polarToCartesian(centerX, centerY, innerRadius, startAngle)
  const largeArcFlag = endAngle - startAngle > 180 ? 1 : 0

  return [
    `M ${outerStart.x} ${outerStart.y}`,
    `A ${outerRadius} ${outerRadius} 0 ${largeArcFlag} 1 ${outerEnd.x} ${outerEnd.y}`,
    `L ${innerEnd.x} ${innerEnd.y}`,
    `A ${innerRadius} ${innerRadius} 0 ${largeArcFlag} 0 ${innerStart.x} ${innerStart.y}`,
    "Z",
  ].join(" ")
}

export function describeFlowPath(x1: number, y1: number, x2: number, y2: number) {
  const controlOffset = Math.max((x2 - x1) * 0.42, 64)
  return `M ${x1} ${y1} C ${x1 + controlOffset} ${y1}, ${x2 - controlOffset} ${y2}, ${x2} ${y2}`
}

export function getBubbleFontSize(radius: number) {
  return Math.max(11, Math.min(26, radius * 0.34))
}

export function getRepelledBubbleOffset(
  bubble: BubbleDatum,
  cursor: { x: number; y: number } | null,
  index: number,
  width: number,
  height: number
) {
  if (!cursor) {
    return { dx: 0, dy: 0 }
  }

  const fromCursorX = bubble.x - cursor.x
  const fromCursorY = bubble.y - cursor.y
  const distance = Math.hypot(fromCursorX, fromCursorY)
  const influenceRadius = bubble.radius + 150

  if (distance >= influenceRadius) {
    return { dx: 0, dy: 0 }
  }

  let unitX = 0
  let unitY = 0
  if (distance < 0.001) {
    const angle = (index * 137.5 * Math.PI) / 180
    unitX = Math.cos(angle)
    unitY = Math.sin(angle)
  } else {
    unitX = fromCursorX / distance
    unitY = fromCursorY / distance
  }

  const strength = ((influenceRadius - distance) / influenceRadius) ** 1.35
  const maxShift = Math.min(84, bubble.radius * 0.9 + 24)
  const shift = maxShift * strength

  const nextX = Math.min(
    width - bubble.radius - 4,
    Math.max(bubble.radius + 4, bubble.x + unitX * shift)
  )
  const nextY = Math.min(
    height - bubble.radius - 4,
    Math.max(bubble.radius + 4, bubble.y + unitY * shift)
  )

  return { dx: nextX - bubble.x, dy: nextY - bubble.y }
}
