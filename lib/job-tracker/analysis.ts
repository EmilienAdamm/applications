import {
  isNotAppliedYetStatus,
  normalizeStatusValue,
} from "@/lib/job-tracker/default-options"
import type {
  JobApplication,
  JobApplicationMetadata,
} from "@/lib/job-tracker/types"

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

export interface AnalysisOverview {
  totalApplications: number
  noResponseCount: number
  activeCount: number
  interviewCount: number
  rejectionCount: number
  offerCount: number
  notAppliedYetCount: number
  responseCount: number
  directRejectionCount: number
  directOfferCount: number
  directInProgressCount: number
  interviewRejectionCount: number
  interviewOfferCount: number
  interviewInProgressCount: number
}

export interface CountByLabel {
  label: string
  count: number
}

export interface ResumeBreakdownItem extends CountByLabel {
  percent: number
  color: string
}

export interface DailySeriesPoint {
  date: string
  count: number
}

export interface SkillCount {
  label: string
  count: number
}

export interface SalaryAverageBar extends CountByLabel {
  average: number
  currency: string | null
}

export interface WordCount {
  word: string
  count: number
}

export interface BubbleDatum extends WordCount {
  x: number
  y: number
  radius: number
  color: string
  textColor: string
}

export interface BubbleLayout {
  width: number
  height: number
  bubbles: BubbleDatum[]
}

interface FlowPosition {
  x: number
  y: number
}

export interface FlowNode extends FlowPosition {
  key: string
  label: string
  value: number
  color: string
}

export interface FlowLink {
  key: string
  from: FlowPosition
  to: FlowPosition
  value: number
  color: string
}

export interface AnalysisDataset {
  overview: AnalysisOverview
  companyBars: CountByLabel[]
  cvBreakdown: ResumeBreakdownItem[]
  dailySeries: DailySeriesPoint[]
  topSkills: SkillCount[]
  averageSalaryBars: SalaryAverageBar[]
  bubbleLayout: BubbleLayout
  flowNodes: FlowNode[]
  flowLinks: FlowLink[]
}

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
    .replace(/\bengineers?\b/g, "software_engineer")
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
      if (!word || word.length < 3 || WORD_STOP_WORDS.has(word)) {
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
    color:
      CV_COLOR_BY_LABEL[item.label] ??
      FALLBACK_COLORS[index % FALLBACK_COLORS.length],
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

function getTopSkills(
  metadataByApplicationId: Record<string, JobApplicationMetadata>
) {
  const counts = new Map<string, { label: string; count: number }>()

  for (const metadata of Object.values(metadataByApplicationId)) {
    const seenInPost = new Set<string>()

    for (const rawSkill of metadata.skills) {
      const label = rawSkill.trim()
      if (!label) {
        continue
      }

      const normalized = label.toLowerCase()
      if (seenInPost.has(normalized)) {
        continue
      }
      seenInPost.add(normalized)

      const existing = counts.get(normalized)
      if (existing) {
        existing.count += 1
        continue
      }

      counts.set(normalized, { label, count: 1 })
    }
  }

  return [...counts.values()]
    .sort(
      (left, right) => right.count - left.count || left.label.localeCompare(right.label)
    )
    .slice(0, 12)
}

function parseSalaryNumber(fragment: string) {
  const trimmed = fragment.trim()
  if (!trimmed) {
    return null
  }

  const suffix = trimmed.match(/[kKmM]\s*$/)?.[0]?.trim().toLowerCase() ?? ""
  const numericPart = suffix ? trimmed.slice(0, -suffix.length) : trimmed
  const normalized = numericPart.replace(/[,\s]/g, "")
  const value = Number.parseFloat(normalized)
  if (!Number.isFinite(value)) {
    return null
  }

  if (suffix === "k") {
    return value * 1_000
  }
  if (suffix === "m") {
    return value * 1_000_000
  }
  return value
}

function detectSalaryCurrency(value: string) {
  const upper = value.toUpperCase()
  const codeMatch = upper.match(/\b([A-Z]{3})\s*(?=\d)/)
  if (codeMatch?.[1]) {
    return { label: codeMatch[1], currency: codeMatch[1] }
  }
  if (value.includes("$")) {
    return { label: "USD", currency: "USD" }
  }
  if (value.includes("€")) {
    return { label: "EUR", currency: "EUR" }
  }
  if (value.includes("£")) {
    return { label: "GBP", currency: "GBP" }
  }
  return { label: "Unspecified", currency: null }
}

function detectSalaryPeriod(value: string) {
  const lower = value.toLowerCase()
  if (/(?:per|\/)\s*(?:year|yr|annum|annual|yearly)\b/.test(lower)) {
    return "year"
  }
  if (/(?:per|\/)\s*(?:month|mo|monthly)\b/.test(lower)) {
    return "month"
  }
  if (/(?:per|\/)\s*(?:week|wk|weekly)\b/.test(lower)) {
    return "week"
  }
  if (/(?:per|\/)\s*(?:day|daily)\b/.test(lower)) {
    return "day"
  }
  if (/(?:per|\/)\s*(?:hour|hr|hourly)\b/.test(lower)) {
    return "hour"
  }
  return "year"
}

function annualizeSalary(amount: number, period: string) {
  if (period === "month") return amount * 12
  if (period === "week") return amount * 52
  if (period === "day") return amount * 260
  if (period === "hour") return amount * 2_080
  return amount
}

function parseAnnualizedSalary(salaryText: string) {
  const normalized = salaryText.replace(/\s+/g, " ").trim()
  if (!normalized) {
    return null
  }

  const numberPattern = "(\\d[\\d,. ]*(?:\\.\\d+)?\\s*[kKmM]?)"
  const rangePattern = new RegExp(
    `(?:USD|EUR|GBP|[$€£])?\\s*${numberPattern}\\s*(?:-|to|–|—)\\s*(?:USD|EUR|GBP|[$€£])?\\s*${numberPattern}`,
    "i"
  )
  const rangeMatch = normalized.match(rangePattern)

  let amount: number | null = null
  if (rangeMatch?.[1] && rangeMatch[2]) {
    const left = parseSalaryNumber(rangeMatch[1])
    const right = parseSalaryNumber(rangeMatch[2])
    if (left !== null && right !== null) {
      amount = (left + right) / 2
    }
  }

  if (amount === null) {
    const singleMatch = normalized.match(
      /(?:USD|EUR|GBP|[$€£])?\s*(\d[\d,. ]*(?:\.\d+)?\s*[kKmM]?)/i
    )
    if (singleMatch?.[1]) {
      amount = parseSalaryNumber(singleMatch[1])
    }
  }

  if (amount === null) {
    return null
  }

  const { label, currency } = detectSalaryCurrency(normalized)
  const period = detectSalaryPeriod(normalized)

  return {
    label,
    currency,
    amount: annualizeSalary(amount, period),
  }
}

function getAverageSalaryBars(
  metadataByApplicationId: Record<string, JobApplicationMetadata>
) {
  const buckets = new Map<
    string,
    { label: string; currency: string | null; total: number; count: number }
  >()

  for (const metadata of Object.values(metadataByApplicationId)) {
    const parsed = parseAnnualizedSalary(metadata.salaryText)
    if (!parsed) {
      continue
    }

    const bucket = buckets.get(parsed.label)
    if (bucket) {
      bucket.total += parsed.amount
      bucket.count += 1
      continue
    }

    buckets.set(parsed.label, {
      label: parsed.label,
      currency: parsed.currency,
      total: parsed.amount,
      count: 1,
    })
  }

  return [...buckets.values()]
    .map((bucket) => ({
      label: bucket.label,
      currency: bucket.currency,
      count: bucket.count,
      average: bucket.total / bucket.count,
    }))
    .sort(
      (left, right) => right.count - left.count || left.label.localeCompare(right.label)
    )
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
  return applications.filter(hasInterviewStage).length
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

function hasInterviewStage(application: JobApplication) {
  return /(interview|entretien)/i.test(application.status)
}

function hasFinalRejection(application: JobApplication) {
  const status = normalizeStatusValue(application.status)
  const finalStatus = normalizeStatusValue(application.finalStatus)
  return status === "DENIED" || finalStatus === "DENIED"
}

function hasFinalOffer(application: JobApplication) {
  const status = normalizeStatusValue(application.status)
  const finalStatus = normalizeStatusValue(application.finalStatus)
  return (
    status === "OFFER" ||
    finalStatus === "OFFER" ||
    status === "ACCEPTED" ||
    finalStatus === "ACCEPTED"
  )
}

function buildResponseFlowBreakdown(applications: JobApplication[]) {
  let directRejectionCount = 0
  let directOfferCount = 0
  let directInProgressCount = 0
  let interviewRejectionCount = 0
  let interviewOfferCount = 0
  let interviewInProgressCount = 0

  for (const application of applications) {
    const finalStatus = normalizeStatusValue(application.finalStatus)

    if (isNotAppliedYetStatus(application.status) && finalStatus === "") {
      continue
    }

    if (
      normalizeStatusValue(application.status) === "APPLIED" &&
      finalStatus === ""
    ) {
      continue
    }

    const hasInterview = hasInterviewStage(application)
    const isRejected = hasFinalRejection(application)
    const isOffer = hasFinalOffer(application)

    if (hasInterview) {
      if (isRejected) {
        interviewRejectionCount += 1
        continue
      }

      if (isOffer) {
        interviewOfferCount += 1
        continue
      }

      interviewInProgressCount += 1
      continue
    }

    if (isRejected) {
      directRejectionCount += 1
      continue
    }

    if (isOffer) {
      directOfferCount += 1
      continue
    }

    directInProgressCount += 1
  }

  return {
    directRejectionCount,
    directOfferCount,
    directInProgressCount,
    interviewRejectionCount,
    interviewOfferCount,
    interviewInProgressCount,
  }
}

function getBubbleRadius(count: number, minCount: number, maxCount: number) {
  const span = Math.max(maxCount - minCount, 1)
  const ratio = (count - minCount) / span
  return 42 + ratio * 88
}

function getWordBubbleLayout(topWords: WordCount[]): BubbleLayout {
  const width = 1320
  const height = 760
  const centerX = width / 2
  const centerY = height / 2

  if (topWords.length === 0) {
    return { width, height, bubbles: [] }
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

  const bubbles: BubbleDatum[] = []

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
      const turns = Math.max(
        16,
        Math.floor((2 * Math.PI * Math.max(distance, 1)) / 14)
      )
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
        Math.min(
          width - radius - 4,
          centerX + Math.cos(fallbackAngle) * fallbackDistance
        )
      )
      y = Math.max(
        radius + 4,
        Math.min(
          height - radius - 4,
          centerY + Math.sin(fallbackAngle) * fallbackDistance * 0.7
        )
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

function buildFlowData(overview: AnalysisOverview) {
  const flowSource = { x: 28, y: 176 }
  const flowNotAppliedYet = { x: 292, y: 26 }
  const flowNoResponse = { x: 292, y: 176 }
  const flowResponses = { x: 292, y: 326 }
  const flowInterviews = { x: 556, y: 326 }
  const flowRejections = { x: 820, y: 26 }
  const flowOffers = { x: 820, y: 176 }
  const flowInProgress = { x: 820, y: 326 }

  const flowNodes: FlowNode[] = [
    {
      key: "applications",
      label: "Applications",
      value: overview.totalApplications,
      color: "#0f766e",
      ...flowSource,
    },
    {
      key: "not-applied-yet",
      label: "Not applied yet",
      value: overview.notAppliedYetCount,
      color: "#a855f7",
      ...flowNotAppliedYet,
    },
    {
      key: "no-response",
      label: "No response",
      value: overview.noResponseCount,
      color: "#f59e0b",
      ...flowNoResponse,
    },
    {
      key: "responses",
      label: "Responses",
      value: overview.responseCount,
      color: "#0284c7",
      ...flowResponses,
    },
    {
      key: "interviews",
      label: "Interviews",
      value: overview.interviewCount,
      color: "#14b8a6",
      ...flowInterviews,
    },
    {
      key: "rejections",
      label: "Rejections",
      value: overview.rejectionCount,
      color: "#ef4444",
      ...flowRejections,
    },
    {
      key: "offers",
      label: "Offers",
      value: overview.offerCount,
      color: "#10b981",
      ...flowOffers,
    },
    {
      key: "in-progress",
      label: "In progress",
      value:
        overview.directInProgressCount + overview.interviewInProgressCount,
      color: "#6366f1",
      ...flowInProgress,
    },
  ]

  const flowLinks: FlowLink[] = [
    {
      key: "applications-not-applied-yet",
      from: flowSource,
      to: flowNotAppliedYet,
      value: overview.notAppliedYetCount,
      color: "#c084fc",
    },
    {
      key: "applications-no-response",
      from: flowSource,
      to: flowNoResponse,
      value: overview.noResponseCount,
      color: "#f59e0b",
    },
    {
      key: "applications-responses",
      from: flowSource,
      to: flowResponses,
      value: overview.responseCount,
      color: "#06b6d4",
    },
    {
      key: "responses-interviews",
      from: flowResponses,
      to: flowInterviews,
      value: overview.interviewCount,
      color: "#14b8a6",
    },
    {
      key: "responses-rejections",
      from: flowResponses,
      to: flowRejections,
      value: overview.directRejectionCount,
      color: "#fb7185",
    },
    {
      key: "responses-offers",
      from: flowResponses,
      to: flowOffers,
      value: overview.directOfferCount,
      color: "#34d399",
    },
    {
      key: "responses-in-progress",
      from: flowResponses,
      to: flowInProgress,
      value: overview.directInProgressCount,
      color: "#818cf8",
    },
    {
      key: "interviews-rejections",
      from: flowInterviews,
      to: flowRejections,
      value: overview.interviewRejectionCount,
      color: "#ef4444",
    },
    {
      key: "interviews-offers",
      from: flowInterviews,
      to: flowOffers,
      value: overview.interviewOfferCount,
      color: "#10b981",
    },
    {
      key: "interviews-in-progress",
      from: flowInterviews,
      to: flowInProgress,
      value: overview.interviewInProgressCount,
      color: "#818cf8",
    },
  ]

  return { flowNodes, flowLinks }
}

export function buildAnalysisDataset(
  applications: JobApplication[],
  metadataByApplicationId: Record<string, JobApplicationMetadata>
): AnalysisDataset {
  const totalApplications = applications.length
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
  const {
    directRejectionCount,
    directOfferCount,
    directInProgressCount,
    interviewRejectionCount,
    interviewOfferCount,
    interviewInProgressCount,
  } = buildResponseFlowBreakdown(applications)

  const overview: AnalysisOverview = {
    totalApplications,
    noResponseCount,
    activeCount,
    interviewCount,
    rejectionCount,
    offerCount,
    notAppliedYetCount,
    responseCount,
    directRejectionCount,
    directOfferCount,
    directInProgressCount,
    interviewRejectionCount,
    interviewOfferCount,
    interviewInProgressCount,
  }

  const topWords = getTopWords(applications)
  const { flowNodes, flowLinks } = buildFlowData(overview)

  return {
    overview,
    companyBars: getCompanyBars(applications),
    cvBreakdown: getCvBreakdown(applications),
    dailySeries: getDailySeries(applications),
    topSkills: getTopSkills(metadataByApplicationId),
    averageSalaryBars: getAverageSalaryBars(metadataByApplicationId),
    bubbleLayout: getWordBubbleLayout(topWords),
    flowNodes,
    flowLinks,
  }
}
