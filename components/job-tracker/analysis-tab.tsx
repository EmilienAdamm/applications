import { useState, type CSSProperties } from "react"

import { isNotAppliedYetStatus, normalizeStatusValue } from "@/lib/job-tracker/default-options"
import type { JobApplication } from "@/lib/job-tracker/types"

interface AnalysisTabProps {
  applications: JobApplication[]
}

const CV_COLOR_BY_LABEL: Record<string, string> = {
  CH: "#fca5a5",
  "CH V2": "#f87171",
  "FR + CH": "#93c5fd",
  "FR V2": "#60a5fa",
  Unknown: "#cbd5e1",
}

const FALLBACK_COLORS = [
  "#86efac",
  "#a5b4fc",
  "#fbcfe8",
  "#fcd34d",
  "#67e8f9",
  "#d8b4fe",
]

const WORD_STOP_WORDS = new Set([
  "and",
  "for",
  "with",
  "from",
  "open",
  "across",
  "new",
  "grad",
  "graduate",
  "graduates",
  "university",
  "entry",
  "level",
  "junior",
  "senior",
  "intern",
  "internship",
  "start",
  "fall",
  "summer",
  "date",
  "dates",
  "remote",
  "area",
  "city",
  "london",
  "singapore",
  "mexico",
  "francisco",
  "denver",
  "zurich",
  "california",
  "platforms",
  "program",
  "programm",
  "2025",
  "2026",
  "2027",
  "usa",
  "gbr",
  "ltd",
  "amts",
  "mts",
])

function normalizeLabel(value: string) {
  return value.trim() || "Unknown"
}

function countBy<T>(items: T[], getKey: (item: T) => string) {
  const counts = new Map<string, number>()
  for (const item of items) {
    const key = normalizeLabel(getKey(item))
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }
  return [...counts.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((left, right) => right.count - left.count)
}

function getCompanyBars(applications: JobApplication[]) {
  const ranked = countBy(applications, (item) => item.companyName)
  if (ranked.length <= 10) {
    return ranked
  }

  const topTen = ranked.slice(0, 10)
  const otherCount = ranked.slice(10).reduce((sum, item) => sum + item.count, 0)
  return [...topTen, { label: "Other", count: otherCount }]
}

function normalizeJobPosition(position: string) {
  return position
    .toLowerCase()
    .replace(/software[\s-]+engineering/g, "software_engineer")
    .replace(/software[\s-]+enginners?/g, "software_engineer")
    .replace(/software[\s-]+engineers?/g, "software_engineer")
    .replace(/san[\s-]+francisco/g, "san_francisco")
    .replace(/front[\s-]?end/g, "frontend")
    .replace(/back[\s-]?end/g, "backend")
    .replace(/full[\s-]?stack/g, "fullstack")
    .replace(/c\+\+/g, "cpp")
    .replace(/\n/g, " ")
}

function getTopWords(applications: JobApplication[]) {
  const counts = new Map<string, number>()

  for (const application of applications) {
    const words = normalizeJobPosition(application.jobPosition).split(
      /[^a-z0-9+#_]+/g
    )

    for (const rawWord of words) {
      const word = rawWord.trim()
      if (!word) {
        continue
      }
      if (word.length < 3) {
        continue
      }
      if (WORD_STOP_WORDS.has(word)) {
        continue
      }

      counts.set(word, (counts.get(word) ?? 0) + 1)
    }
  }

  return [...counts.entries()]
    .map(([word, count]) => ({ word, count }))
    .sort((left, right) => right.count - left.count)
    .slice(0, 20)
}

function getCvBreakdown(applications: JobApplication[]) {
  const ranked = countBy(applications, (item) => item.cvUsed)
  const total = ranked.reduce((sum, item) => sum + item.count, 0)

  return ranked.map((item, index) => ({
    ...item,
    percent: total === 0 ? 0 : Math.round((item.count / total) * 100),
    color: CV_COLOR_BY_LABEL[item.label] ?? FALLBACK_COLORS[index % FALLBACK_COLORS.length],
  }))
}

function getDailySeries(applications: JobApplication[]) {
  const counts = new Map<string, number>()

  for (const application of applications) {
    const date = application.dateOfApplication.trim()
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      continue
    }
    counts.set(date, (counts.get(date) ?? 0) + 1)
  }

  return [...counts.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([date, count]) => ({ date, count }))
}

function dateLabel(date: string) {
  const value = new Date(`${date}T00:00:00`)
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(value)
}

function countNoResponse(applications: JobApplication[]) {
  return applications.filter((application) => {
    const status = normalizeStatusValue(application.status)
    const finalStatus = normalizeStatusValue(application.finalStatus)
    return status === "APPLIED" && finalStatus === ""
  }).length
}

function countNotAppliedYet(applications: JobApplication[]) {
  return applications.filter((application) => {
    const finalStatus = normalizeStatusValue(application.finalStatus)
    return isNotAppliedYetStatus(application.status) && finalStatus === ""
  }).length
}

function countActive(applications: JobApplication[]) {
  return applications.filter((application) => {
    const finalStatus = normalizeStatusValue(application.finalStatus)
    return finalStatus !== "DENIED" && finalStatus !== "OFFER"
  }).length
}

function countInterviews(applications: JobApplication[]) {
  return applications.filter((application) =>
    /INTERVIEW/i.test(application.status)
  ).length
}

function countRejections(applications: JobApplication[]) {
  return applications.filter((application) => {
    const status = normalizeStatusValue(application.status)
    const finalStatus = normalizeStatusValue(application.finalStatus)
    return status === "DENIED" || finalStatus === "DENIED"
  }).length
}

function countOffers(applications: JobApplication[]) {
  return applications.filter((application) => {
    const status = normalizeStatusValue(application.status)
    const finalStatus = normalizeStatusValue(application.finalStatus)
    return (
      status === "OFFER" ||
      finalStatus === "OFFER" ||
      status === "ACCEPTED" ||
      finalStatus === "ACCEPTED"
    )
  }).length
}

function percentOf(value: number, total: number) {
  if (total <= 0) {
    return "0%"
  }
  return `${Math.round((value / total) * 100)}%`
}

function MetricCard({
  label,
  value,
  percentage,
  percentageToneClassName,
  hoverToneClassName,
}: {
  label: string
  value: string | number
  percentage?: string
  percentageToneClassName?: string
  hoverToneClassName?: string
}) {
  return (
    <article
      className={`rounded-2xl border border-white/70 bg-white p-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md dark:border-white/10 dark:bg-zinc-900/80 ${hoverToneClassName ?? "hover:bg-zinc-50 dark:hover:bg-zinc-900"}`}
    >
      <p className="text-xs uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="mt-2 text-2xl font-semibold tracking-tight">{value}</p>
      {percentage ? (
        <p className={`mt-1 text-xs font-medium ${percentageToneClassName ?? "text-muted-foreground"}`}>
          {percentage}
        </p>
      ) : null}
    </article>
  )
}

function formatRatioPercent(value: number, total: number) {
  if (total <= 0) {
    return "0%"
  }

  const percent = (value / total) * 100
  const rounded = Number.isInteger(percent)
    ? percent.toFixed(0)
    : percent.toFixed(1)
  return `${rounded}% of total`
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

function describeDonutSlice(
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

function describeFlowPath(x1: number, y1: number, x2: number, y2: number) {
  const controlOffset = Math.max((x2 - x1) * 0.42, 64)
  return `M ${x1} ${y1} C ${x1 + controlOffset} ${y1}, ${x2 - controlOffset} ${y2}, ${x2} ${y2}`
}

function getBubbleRadius(count: number, minCount: number, maxCount: number) {
  const span = Math.max(maxCount - minCount, 1)
  const ratio = (count - minCount) / span
  return 42 + ratio * 88
}

function getBubbleFontSize(radius: number) {
  return Math.max(11, Math.min(26, radius * 0.34))
}

function getRepelledBubbleOffset(
  bubble: { x: number; y: number; radius: number },
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
    // Golden-angle fallback so bubbles do not stack in the same direction.
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

function getWordBubbleLayout(topWords: Array<{ word: string; count: number }>) {
  const width = 1320
  const height = 760
  const centerX = width / 2
  const centerY = height / 2

  if (topWords.length === 0) {
    return { width, height, bubbles: [] as Array<{
      word: string
      count: number
      x: number
      y: number
      radius: number
      color: string
      textColor: string
    }> }
  }

  const maxWordCount = topWords[0]?.count ?? 1
  const minWordCount = topWords[topWords.length - 1]?.count ?? 1
  const colors = [
    { fill: "#d1fae5", text: "#065f46" },
    { fill: "#dbeafe", text: "#1e3a8a" },
    { fill: "#ede9fe", text: "#5b21b6" },
    { fill: "#fef3c7", text: "#92400e" },
    { fill: "#ffe4e6", text: "#9f1239" },
    { fill: "#cffafe", text: "#155e75" },
  ]

  const bubbles: Array<{
    word: string
    count: number
    x: number
    y: number
    radius: number
    color: string
    textColor: string
  }> = []

  for (let index = 0; index < topWords.length; index += 1) {
    const item = topWords[index]
    const radius = getBubbleRadius(item.count, minWordCount, maxWordCount)

    let placed = false
    let x = centerX
    let y = centerY

    if (bubbles.length === 0) {
      bubbles.push({
        word: item.word,
        count: item.count,
        x: centerX,
        y: centerY,
        radius,
        color: colors[index % colors.length].fill,
        textColor: colors[index % colors.length].text,
      })
      continue
    }

    for (let distance = 0; distance <= 760 && !placed; distance += 6) {
      const turns = Math.max(16, Math.floor((2 * Math.PI * Math.max(distance, 1)) / 14))
      for (let step = 0; step < turns; step += 1) {
        const angle = (step / turns) * Math.PI * 2 + index * 0.45
        const candidateX = centerX + Math.cos(angle) * distance
        const candidateY = centerY + Math.sin(angle) * distance * 0.78

        if (
          candidateX - radius < 4 ||
          candidateX + radius > width - 4 ||
          candidateY - radius < 4 ||
          candidateY + radius > height - 4
        ) {
          continue
        }

        const intersects = bubbles.some((bubble) => {
          const dx = bubble.x - candidateX
          const dy = bubble.y - candidateY
          return Math.hypot(dx, dy) < bubble.radius + radius + 4
        })

        if (!intersects) {
          x = candidateX
          y = candidateY
          placed = true
          break
        }
      }
    }

    if (!placed) {
      const fallbackAngle = index * 1.618
      const fallbackDistance = 40 + index * 12
      x = Math.max(
        radius + 4,
        Math.min(width - radius - 4, centerX + Math.cos(fallbackAngle) * fallbackDistance)
      )
      y = Math.max(
        radius + 4,
        Math.min(height - radius - 4, centerY + Math.sin(fallbackAngle) * fallbackDistance * 0.7)
      )
    }

    bubbles.push({
      word: item.word,
      count: item.count,
      x,
      y,
      radius,
      color: colors[index % colors.length].fill,
      textColor: colors[index % colors.length].text,
    })
  }

  return { width, height, bubbles }
}

export function AnalysisTab({ applications }: AnalysisTabProps) {
  const [hoveredCvLabel, setHoveredCvLabel] = useState<string | null>(null)
  const [bubbleCursor, setBubbleCursor] = useState<{ x: number; y: number } | null>(null)
  const [hoveredDayPoint, setHoveredDayPoint] = useState<{
    date: string
    count: number
    x: number
    y: number
  } | null>(null)

  const totalApplications = applications.length
  const companyBars = getCompanyBars(applications)
  const topWords = getTopWords(applications)
  const cvBreakdown = getCvBreakdown(applications)
  const dailySeries = getDailySeries(applications)

  const notAppliedYetCount = countNotAppliedYet(applications)
  const noResponseCount = countNoResponse(applications)
  const activeCount = countActive(applications)
  const interviewCount = countInterviews(applications)
  const rejectionCount = countRejections(applications)
  const offerCount = countOffers(applications)
  const responseCount = Math.max(
    totalApplications - notAppliedYetCount - noResponseCount,
    0
  )
  const rejectedFromResponses = Math.min(rejectionCount, responseCount)
  const offersFromResponses = Math.min(
    offerCount,
    Math.max(responseCount - rejectedFromResponses, 0)
  )
  const inProgressFromResponses = Math.max(
    responseCount - rejectedFromResponses - offersFromResponses,
    0
  )

  const noResponsePercent = formatRatioPercent(noResponseCount, totalApplications)
  const activePercent = formatRatioPercent(activeCount, totalApplications)
  const interviewPercent = formatRatioPercent(interviewCount, totalApplications)
  const rejectionPercent = formatRatioPercent(rejectionCount, totalApplications)

  const maxBarCount = Math.max(...companyBars.map((item) => item.count), 1)
  const bubbleLayout = getWordBubbleLayout(topWords)
  const hoveredCvSlice = cvBreakdown.find((item) => item.label === hoveredCvLabel)
  const isCvLegendHovered = hoveredCvLabel !== null
  const donutSize = 220
  const donutCenter = donutSize / 2
  const donutInnerRadius = 56
  const donutOuterRadius = 84
  const donutTotal = cvBreakdown.reduce((sum, item) => sum + item.count, 0)

  const cvDonutSlices: Array<{
    label: string
    count: number
    percent: number
    color: string
    opacity: number
    path: string
  }> = []
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
    const opacity = isCvLegendHovered && !isActive ? 0.28 : 1

    cvDonutSlices.push({
      ...item,
      opacity,
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

  const flowWidth = 980
  const flowHeight = 420
  const flowNodeWidth = 168
  const flowNodeHeight = 64
  const flowSource = { x: 30, y: 148 }
  const flowNotAppliedYet = { x: 324, y: 28 }
  const flowNoResponse = { x: 324, y: 148 }
  const flowResponses = { x: 324, y: 268 }
  const flowRejections = { x: 620, y: 28 }
  const flowOffers = { x: 620, y: 148 }
  const flowInProgress = { x: 620, y: 268 }
  const flowNodes = [
    { key: "applications", label: "Applications", value: totalApplications, color: "#0f766e", ...flowSource },
    { key: "not-applied-yet", label: "Not applied yet", value: notAppliedYetCount, color: "#a855f7", ...flowNotAppliedYet },
    { key: "no-response", label: "No response", value: noResponseCount, color: "#f59e0b", ...flowNoResponse },
    { key: "responses", label: "Responses", value: responseCount, color: "#0284c7", ...flowResponses },
    { key: "rejections", label: "Rejections", value: rejectedFromResponses, color: "#ef4444", ...flowRejections },
    { key: "offers", label: "Offers", value: offersFromResponses, color: "#10b981", ...flowOffers },
    { key: "in-progress", label: "In progress", value: inProgressFromResponses, color: "#6366f1", ...flowInProgress },
  ] as const
  const flowLinks = [
    {
      key: "applications-not-applied-yet",
      from: flowSource,
      to: flowNotAppliedYet,
      value: notAppliedYetCount,
      color: "#c084fc",
    },
    {
      key: "applications-no-response",
      from: flowSource,
      to: flowNoResponse,
      value: noResponseCount,
      color: "#f59e0b",
    },
    {
      key: "applications-responses",
      from: flowSource,
      to: flowResponses,
      value: responseCount,
      color: "#06b6d4",
    },
    {
      key: "responses-rejections",
      from: flowResponses,
      to: flowRejections,
      value: rejectedFromResponses,
      color: "#fb7185",
    },
    {
      key: "responses-offers",
      from: flowResponses,
      to: flowOffers,
      value: offersFromResponses,
      color: "#34d399",
    },
    {
      key: "responses-in-progress",
      from: flowResponses,
      to: flowInProgress,
      value: inProgressFromResponses,
      color: "#818cf8",
    },
  ] as const
  const maxFlowValue = Math.max(
    ...flowLinks.map((link) => link.value),
    totalApplications,
    1
  )

  const chartWidth = 760
  const chartHeight = 240
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
    <section className="space-y-4">
      <header className="rounded-2xl border border-white/70 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-zinc-900/80">
        <h2 className="text-xl font-semibold">Analytics</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Overview of companies, roles, resume usage and daily application trends.
        </p>
      </header>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <MetricCard
          label="Applications"
          value={totalApplications}
          hoverToneClassName="hover:bg-zinc-50 dark:hover:bg-zinc-800/80"
        />
        <MetricCard
          label="No response"
          value={noResponseCount}
          percentage={noResponsePercent}
          percentageToneClassName="text-amber-600 dark:text-amber-400"
          hoverToneClassName="hover:bg-amber-50 dark:hover:bg-amber-950/20"
        />
        <MetricCard
          label="Active (not denied / offer)"
          value={activeCount}
          percentage={activePercent}
          percentageToneClassName="text-emerald-600 dark:text-emerald-400"
          hoverToneClassName="hover:bg-emerald-50 dark:hover:bg-emerald-950/20"
        />
        <MetricCard
          label="Interview stages"
          value={interviewCount}
          percentage={interviewPercent}
          percentageToneClassName="text-sky-600 dark:text-sky-400"
          hoverToneClassName="hover:bg-sky-50 dark:hover:bg-sky-950/20"
        />
        <MetricCard
          label="Rejections"
          value={rejectionCount}
          percentage={rejectionPercent}
          percentageToneClassName="text-rose-600 dark:text-rose-400"
          hoverToneClassName="hover:bg-rose-50 dark:hover:bg-rose-950/20"
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <article className="rounded-2xl border border-white/70 bg-white p-5 shadow-sm xl:col-span-2 dark:border-white/10 dark:bg-zinc-900/80">
          <h3 className="text-base font-semibold">Top companies applied to</h3>
          <p className="text-xs text-muted-foreground">
            Top 10 + Other when there are many companies.
          </p>
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
        </article>

        <article className="rounded-2xl border border-white/70 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-zinc-900/80">
          <h3 className="text-base font-semibold">Resume usage distribution</h3>
          <p className="text-xs text-muted-foreground">
            Percentage split by resume used.
          </p>
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
                      <p className="text-xl font-semibold" style={{ color: hoveredCvSlice.color }}>
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
                      hoveredCvLabel === item.label
                        ? "bg-zinc-100 dark:bg-zinc-800/60"
                        : ""
                    }`}
                    onMouseEnter={() => setHoveredCvLabel(item.label)}
                    onMouseLeave={() => setHoveredCvLabel((current) => (current === item.label ? null : current))}
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
        </article>

        <article className="rounded-2xl border border-white/70 bg-white p-5 shadow-sm xl:col-span-3 dark:border-white/10 dark:bg-zinc-900/80">
          <h3 className="text-base font-semibold">Application flow</h3>
          <p className="text-xs text-muted-foreground">
            Flow from total applications to not applied yet, no response, responses, and outcomes.
          </p>
          <div className="mt-4 overflow-x-auto">
            <svg
              viewBox={`0 0 ${flowWidth} ${flowHeight}`}
              className="h-[260px] min-w-[640px] w-full md:h-[340px] md:min-w-[900px]"
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
                const strokeWidth = Math.max((link.value / maxFlowValue) * 34, 6)
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
                    rx="14"
                    fill={node.color}
                    fillOpacity="0.12"
                    stroke={node.color}
                    strokeOpacity="0.5"
                  />
                  <text
                    x={node.x + 12}
                    y={node.y + 22}
                    className="fill-zinc-700 text-[11px] font-semibold uppercase tracking-wide dark:fill-zinc-200"
                  >
                    {node.label}
                  </text>
                  <text
                    x={node.x + 12}
                    y={node.y + 43}
                    className="fill-zinc-900 text-[20px] font-bold dark:fill-zinc-100"
                  >
                    {node.value}
                  </text>
                  <text
                    x={node.x + flowNodeWidth - 12}
                    y={node.y + 43}
                    textAnchor="end"
                    className="fill-zinc-500 text-[11px] font-medium dark:fill-zinc-300"
                  >
                    {node.key === "applications"
                      ? "100%"
                      : percentOf(node.value, totalApplications)}
                  </text>
                </g>
              ))}
            </svg>
          </div>
        </article>

        <article className="rounded-2xl border border-white/70 bg-white p-5 shadow-sm xl:col-span-3 dark:border-white/10 dark:bg-zinc-900/80">
          <h3 className="text-base font-semibold">Applications by day</h3>
          <p className="text-xs text-muted-foreground">
            Number of applications for each application day.
          </p>
          {dailySeries.length === 0 ? (
            <p className="mt-4 text-sm text-muted-foreground">No date data available.</p>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <svg
                viewBox={`0 0 ${chartWidth} ${chartHeight}`}
                className="h-[220px] min-w-[520px] w-full md:h-[260px] md:min-w-[680px]"
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
                      <title>
                        {`${dateLabel(point.date)}: ${point.count} applications`}
                      </title>
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
        </article>

        <article className="rounded-2xl border border-white/70 bg-white p-5 shadow-sm xl:col-span-3 dark:border-white/10 dark:bg-zinc-900/80">
          <h3 className="text-base font-semibold">Most frequent role words</h3>
          <p className="text-xs text-muted-foreground">
            Bubble view of recurring words in job position titles.
          </p>
          {topWords.length === 0 ? (
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
                  const x = ((event.clientX - rect.left) / rect.width) * bubbleLayout.width
                  const y = ((event.clientY - rect.top) / rect.height) * bubbleLayout.height
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
                        style={{ fontSize: `${getBubbleFontSize(bubble.radius)}px` } as CSSProperties}
                        fill={bubble.textColor}
                        className="font-semibold"
                      >
                        {bubble.word.replace(/_/g, " ")}
                      </text>
                      <text
                        x={bubble.x}
                        y={bubble.y + getBubbleFontSize(bubble.radius)}
                        textAnchor="middle"
                        style={{
                          fontSize: `${Math.max(10, getBubbleFontSize(bubble.radius) - 2)}px`,
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
        </article>
      </div>
    </section>
  )
}
