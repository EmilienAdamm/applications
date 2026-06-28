import "server-only"

import { normalizeJobPostUrl } from "@/lib/job-tracker/job-post-metadata"
import type { JobPostLinkPreview } from "@/lib/job-tracker/types"

const PREVIEW_TIMEOUT_MS = 8_000
const MAX_PREVIEW_BYTES = 140_000
const MAX_REDIRECTS = 3

const GENERIC_SITE_NAMES = new Set(
  [
    "linkedin",
    "indeed",
    "greenhouse",
    "lever",
    "ashby",
    "ashbyhq",
    "workday",
    "workable",
    "smartrecruiters",
    "welcome to the jungle",
    "wellfound",
    "angelist",
    "bamboohr",
    "jobvite",
    "applytojob",
    "icims",
    "teamtailor",
    "personio",
    "jobs",
    "careers",
  ].map(normalizeCompanyKey)
)

const GENERIC_TITLE_SEGMENTS = new Set(
  [
    "jobs",
    "careers",
    "job board",
    "job application",
    "greenhouse",
    "lever",
    "ashby",
    "ashbyhq",
    "linkedin",
    "indeed",
    "workday",
    "workable",
    "smartrecruiters",
  ].map(normalizeCompanyKey)
)

const JOB_TITLE_HINT_PATTERN =
  /\b(engineer|developer|software|frontend|front-end|backend|back-end|fullstack|full-stack|data|product|designer|design|manager|lead|staff|principal|senior|junior|intern|internship|analyst|scientist|architect|devops|security|sales|marketing|finance|recruiter|talent|operations|founder|ios|android|mobile|platform|infra|infrastructure)\b/i

interface MetaEntry {
  key: string
  content: string
}

interface StructuredJobPosting {
  title?: string
  companyName?: string
}

export async function fetchJobPostLinkPreview(
  url: string
): Promise<JobPostLinkPreview> {
  const normalizedUrl = normalizeJobPostUrl(url)
  if (!normalizedUrl) {
    return createFailedPreview(url, "Invalid job post URL")
  }

  const blockedReason = getBlockedUrlReason(normalizedUrl)
  if (blockedReason) {
    return createFailedPreview(normalizedUrl, blockedReason)
  }

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), PREVIEW_TIMEOUT_MS)

  try {
    const { response, sourceUrl } = await fetchPreviewResponse(
      normalizedUrl,
      controller.signal
    )

    if (!response.ok) {
      return createFailedPreview(
        sourceUrl,
        `Link preview request failed with status ${response.status}`
      )
    }

    const contentType = response.headers.get("content-type") ?? ""
    if (contentType && !contentType.toLowerCase().includes("text/html")) {
      return createFailedPreview(sourceUrl, "The URL did not return an HTML page")
    }

    const html = await readInitialHtml(response)
    return extractJobPostLinkPreview(sourceUrl, html)
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown link preview error"
    return createFailedPreview(normalizedUrl, message)
  } finally {
    clearTimeout(timeoutId)
  }
}

async function fetchPreviewResponse(
  url: string,
  signal: AbortSignal,
  redirectCount = 0
): Promise<{ response: Response; sourceUrl: string }> {
  const response = await fetch(url, {
    cache: "no-store",
    redirect: "manual",
    signal,
    headers: {
      Accept: "text/html,application/xhtml+xml",
      "User-Agent":
        "Mozilla/5.0 (compatible; JobTrackerLinkPreview/1.0; +https://localhost)",
    },
  })

  if (isRedirectStatus(response.status)) {
    if (redirectCount >= MAX_REDIRECTS) {
      return { response, sourceUrl: url }
    }

    const location = response.headers.get("location")
    if (!location) return { response, sourceUrl: url }

    const nextUrl = new URL(location, url).toString()
    const blockedReason = getBlockedUrlReason(nextUrl)
    if (blockedReason) {
      throw new Error(blockedReason)
    }

    return fetchPreviewResponse(nextUrl, signal, redirectCount + 1)
  }

  return { response, sourceUrl: response.url || url }
}

function isRedirectStatus(status: number) {
  return status === 301 || status === 302 || status === 303 || status === 307 || status === 308
}

async function readInitialHtml(response: Response) {
  const reader = response.body?.getReader()
  if (!reader) {
    return (await response.text()).slice(0, MAX_PREVIEW_BYTES)
  }

  const decoder = new TextDecoder()
  let html = ""
  let bytesRead = 0

  try {
    while (bytesRead < MAX_PREVIEW_BYTES) {
      const { done, value } = await reader.read()
      if (done) break

      bytesRead += value.byteLength
      html += decoder.decode(value, { stream: true })

      if (/<\/head\s*>/i.test(html)) break
    }
  } finally {
    await reader.cancel().catch(() => undefined)
  }

  return html + decoder.decode()
}

function extractJobPostLinkPreview(
  sourceUrl: string,
  html: string
): JobPostLinkPreview {
  const headHtml = extractHeadHtml(html)
  const meta = extractMetaEntries(headHtml)
  const structuredPosting = extractStructuredJobPosting(headHtml)
  const hostname = new URL(sourceUrl).hostname
  const pageTitle = firstNonEmpty(
    structuredPosting.title,
    getMetaContent(meta, ["og:title", "twitter:title"]),
    extractTitle(headHtml)
  )
  const siteName = firstNonEmpty(
    structuredPosting.companyName,
    getMetaContent(meta, [
      "og:site_name",
      "application-name",
      "apple-mobile-web-app-title",
      "twitter:site",
    ])
  )

  const parsed = deriveJobAndCompany({
    sourceUrl,
    hostname,
    rawTitle: pageTitle,
    rawCompany: siteName,
  })
  const fieldsFound = [parsed.jobPosition, parsed.companyName].filter(Boolean).length

  if (fieldsFound === 0) {
    return {
      sourceUrl,
      sourceTitle: pageTitle,
      companyName: "",
      jobPosition: "",
      extractionStatus: "failed",
      extractionError: "No Open Graph title or company metadata was found",
    }
  }

  return {
    sourceUrl,
    sourceTitle: pageTitle,
    companyName: parsed.companyName,
    jobPosition: parsed.jobPosition,
    extractionStatus: fieldsFound === 2 ? "success" : "partial",
    extractionError: fieldsFound === 2 ? "" : "Only partial link preview metadata was found",
  }
}

function extractHeadHtml(html: string) {
  const match = html.match(/<head\b[^>]*>([\s\S]*?)(?:<\/head\s*>|$)/i)
  return match?.[1] ?? html
}

function extractMetaEntries(html: string): MetaEntry[] {
  const entries: MetaEntry[] = []

  for (const match of html.matchAll(/<meta\b[^>]*>/gi)) {
    const attributes = parseTagAttributes(match[0])
    const key = attributes.property ?? attributes.name ?? attributes.itemprop
    const content = attributes.content
    if (!key || !content) continue

    entries.push({
      key: key.trim().toLowerCase(),
      content: cleanPreviewText(content),
    })
  }

  return entries
}

function getMetaContent(entries: MetaEntry[], keys: string[]) {
  const normalizedKeys = keys.map((key) => key.toLowerCase())
  return firstNonEmpty(
    ...normalizedKeys.map((key) => entries.find((entry) => entry.key === key)?.content)
  )
}

function parseTagAttributes(tag: string) {
  const attributes: Record<string, string> = {}

  for (const match of tag.matchAll(
    /([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+))/g
  )) {
    const [, name, doubleQuoted, singleQuoted, unquoted] = match
    attributes[name.toLowerCase()] = decodeHtmlEntities(
      doubleQuoted ?? singleQuoted ?? unquoted ?? ""
    )
  }

  return attributes
}

function extractTitle(html: string) {
  const match = html.match(/<title\b[^>]*>([\s\S]*?)<\/title\s*>/i)
  return cleanPreviewText(match?.[1] ?? "")
}

function extractStructuredJobPosting(html: string): StructuredJobPosting {
  for (const match of html.matchAll(
    /<script\b[^>]*type\s*=\s*(?:"application\/ld\+json"|'application\/ld\+json')[^>]*>([\s\S]*?)<\/script\s*>/gi
  )) {
    try {
      const parsed = JSON.parse(decodeHtmlEntities(match[1]))
      const posting = findJobPostingObject(parsed)
      if (posting) return posting
    } catch {
      // Ignore invalid JSON-LD blocks.
    }
  }

  return {}
}

function findJobPostingObject(value: unknown): StructuredJobPosting | null {
  if (Array.isArray(value)) {
    for (const item of value) {
      const match = findJobPostingObject(item)
      if (match) return match
    }
    return null
  }

  if (!isRecord(value)) return null

  if (isJobPostingType(value["@type"])) {
    const organization = value.hiringOrganization
    return {
      title: typeof value.title === "string" ? cleanPreviewText(value.title) : "",
      companyName: extractOrganizationName(organization),
    }
  }

  const graph = value["@graph"]
  if (graph) return findJobPostingObject(graph)

  return null
}

function isJobPostingType(value: unknown) {
  if (typeof value === "string") return normalizeCompanyKey(value) === "jobposting"
  if (Array.isArray(value)) return value.some(isJobPostingType)
  return false
}

function extractOrganizationName(value: unknown) {
  if (typeof value === "string") return cleanCompanyName(value)
  if (!isRecord(value)) return ""
  if (typeof value.name === "string") return cleanCompanyName(value.name)
  return ""
}

function deriveJobAndCompany({
  sourceUrl,
  hostname,
  rawTitle,
  rawCompany,
}: {
  sourceUrl: string
  hostname: string
  rawTitle: string
  rawCompany: string
}) {
  let companyName = cleanCompanyName(rawCompany)
  if (isGenericCompanyName(companyName)) companyName = ""

  const titlePattern = extractFromTitlePatterns(rawTitle)
  if (!companyName && titlePattern.companyName) {
    companyName = titlePattern.companyName
  }

  let jobPosition = titlePattern.jobPosition || rawTitle

  if (!companyName) {
    const segments = splitTitleSegments(rawTitle).filter(
      (segment) => !isGenericTitleSegment(segment)
    )

    if (segments.length >= 2) {
      const [first, second] = segments
      if (!looksLikeJobTitle(first) && looksLikeJobTitle(second)) {
        companyName = cleanCompanyName(first)
        jobPosition = second
      } else {
        jobPosition = first
        companyName = cleanCompanyName(second)
      }
    }
  }

  if (companyName) {
    jobPosition = stripCompanyFromTitle(jobPosition, companyName)
  }

  if (!companyName) {
    companyName = companyFromHostname(hostname)
  }

  return {
    companyName: cleanCompanyName(companyName),
    jobPosition: cleanJobTitle(stripUrlNoise(jobPosition, sourceUrl)),
  }
}

function extractFromTitlePatterns(title: string) {
  const cleanTitle = cleanPreviewText(title)
  const patterns: Array<{
    regex: RegExp
    order: "job-company" | "company-job"
  }> = [
    {
      regex: /^job application for\s+(.+?)\s+(?:at|chez)\s+(.+)$/i,
      order: "job-company",
    },
    {
      regex: /^(.+?)\s+(?:at|chez|@)\s+(.+)$/i,
      order: "job-company",
    },
    {
      regex: /^(.+?)\s+hiring\s+(.+?)(?:\s+in\s+.+)?$/i,
      order: "company-job",
    },
    {
      regex: /^(.+?)\s+recrute\s+(?:pour\s+)?(?:un|une|des|le|la)?\s*(?:poste[s]?\s+de\s+)?(.+)$/i,
      order: "company-job",
    },
  ]

  for (const { regex, order } of patterns) {
    const match = cleanTitle.match(regex)
    if (!match) continue

    const first = cleanPreviewText(match[1])
    const second = cleanPreviewText(match[2])
    return order === "job-company"
      ? {
          jobPosition: cleanJobTitle(first),
          companyName: cleanCompanyName(second),
        }
      : {
          jobPosition: cleanJobTitle(second),
          companyName: cleanCompanyName(first),
        }
  }

  return { jobPosition: "", companyName: "" }
}

function splitTitleSegments(title: string) {
  return cleanPreviewText(title)
    .split(/\s+(?:[-|–—·])\s+/)
    .map(cleanPreviewText)
    .filter(Boolean)
}

function stripCompanyFromTitle(title: string, companyName: string) {
  const escapedCompany = escapeRegExp(companyName)
  return cleanPreviewText(title)
    .replace(new RegExp(`\\s+(?:at|chez|@)\\s+${escapedCompany}\\b.*$`, "i"), "")
    .replace(new RegExp(`^${escapedCompany}\\s+(?:-|–|—|\\|)\\s+`, "i"), "")
    .replace(new RegExp(`\\s+(?:-|–|—|\\|)\\s+${escapedCompany}\\b.*$`, "i"), "")
}

function stripUrlNoise(title: string, sourceUrl: string) {
  const hostname = new URL(sourceUrl).hostname
  const hostCompany = companyFromHostname(hostname)
  if (!hostCompany) return title
  return stripCompanyFromTitle(title, hostCompany)
}

function cleanJobTitle(value: string) {
  return cleanPreviewText(value)
    .replace(/\s+\|\s+(?:jobs|careers|linkedin|indeed|greenhouse|lever|ashby|workday).*$/i, "")
    .replace(/\s+-\s+(?:jobs|careers|linkedin|indeed|greenhouse|lever|ashby|workday).*$/i, "")
}

function cleanCompanyName(value: string) {
  return cleanPreviewText(value)
    .replace(/^@+/, "")
    .replace(/\s+(?:jobs|careers|job board|career site)$/i, "")
}

function cleanPreviewText(value: string) {
  return decodeHtmlEntities(value)
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

function firstNonEmpty(...values: Array<string | null | undefined>) {
  return values.find((value) => value?.trim())?.trim() ?? ""
}

function looksLikeJobTitle(value: string) {
  return JOB_TITLE_HINT_PATTERN.test(value)
}

function isGenericTitleSegment(value: string) {
  return GENERIC_TITLE_SEGMENTS.has(normalizeCompanyKey(value))
}

function isGenericCompanyName(value: string) {
  return !value || GENERIC_SITE_NAMES.has(normalizeCompanyKey(value))
}

function normalizeCompanyKey(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
}

function companyFromHostname(hostname: string) {
  const lowerHost = hostname.toLowerCase().replace(/^www\./, "")
  if (
    /(greenhouse\.io|lever\.co|ashbyhq\.com|workdayjobs\.com|smartrecruiters\.com|workable\.com|linkedin\.com|indeed\.com|wellfound\.com|bamboohr\.com|jobvite\.com|icims\.com|teamtailor\.com|personio\.)/.test(
      lowerHost
    )
  ) {
    return ""
  }

  const parts = lowerHost.split(".").filter(Boolean)
  const meaningful = parts.filter(
    (part) => !["jobs", "careers", "apply", "boards", "job"].includes(part)
  )
  const label = meaningful.length >= 2 ? meaningful[meaningful.length - 2] : meaningful[0]
  if (!label) return ""

  return label
    .split(/[-_]+/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ")
}

function createFailedPreview(
  sourceUrl: string,
  extractionError: string
): JobPostLinkPreview {
  return {
    sourceUrl,
    sourceTitle: "",
    companyName: "",
    jobPosition: "",
    extractionStatus: "failed",
    extractionError,
  }
}

function getBlockedUrlReason(url: string) {
  try {
    const parsed = new URL(url)
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return "Only HTTP and HTTPS job post URLs are supported"
    }

    const hostname = parsed.hostname.replace(/^\[|\]$/g, "").toLowerCase()
    if (
      hostname === "localhost" ||
      hostname.endsWith(".localhost") ||
      hostname.endsWith(".local") ||
      hostname.endsWith(".internal")
    ) {
      return "Local job post URLs cannot be previewed"
    }

    if (isPrivateIpv4(hostname) || isPrivateIpv6(hostname)) {
      return "Private network URLs cannot be previewed"
    }
  } catch {
    return "Invalid job post URL"
  }

  return ""
}

function isPrivateIpv4(hostname: string) {
  const parts = hostname.split(".").map(Number)
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part))) {
    return false
  }

  const [first, second] = parts
  return (
    first === 0 ||
    first === 10 ||
    first === 127 ||
    first === 169 && second === 254 ||
    first === 172 && second >= 16 && second <= 31 ||
    first === 192 && second === 168 ||
    first === 100 && second >= 64 && second <= 127 ||
    first === 198 && (second === 18 || second === 19) ||
    first >= 224
  )
}

function isPrivateIpv6(hostname: string) {
  return (
    hostname === "::1" ||
    hostname.startsWith("fc") ||
    hostname.startsWith("fd") ||
    hostname.startsWith("fe80:")
  )
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

function decodeHtmlEntities(value: string) {
  return value.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (entity, code: string) => {
    const lowerCode = code.toLowerCase()
    const namedEntities: Record<string, string> = {
      amp: "&",
      apos: "'",
      gt: ">",
      lt: "<",
      nbsp: " ",
      quot: "\"",
    }

    if (lowerCode in namedEntities) return namedEntities[lowerCode]
    if (lowerCode.startsWith("#x")) {
      return String.fromCodePoint(Number.parseInt(lowerCode.slice(2), 16))
    }
    if (lowerCode.startsWith("#")) {
      return String.fromCodePoint(Number.parseInt(lowerCode.slice(1), 10))
    }

    return entity
  })
}
