import "server-only"

export type JobPostMetadataStatus = "success" | "partial" | "failed"

export interface JobPostMetadataResult {
  sourceUrl: string
  sourceTitle: string
  salaryText: string
  locations: string[]
  skills: string[]
  extractionStatus: JobPostMetadataStatus
  extractionError: string
  fetchedAt: Date
}

const REQUEST_HEADERS = {
  Accept: "text/html,application/xhtml+xml",
  "Accept-Language": "en-US,en;q=0.9,fr;q=0.8",
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
}

const COMMON_SKILLS = [
  "React",
  "Next.js",
  "TypeScript",
  "JavaScript",
  "Node.js",
  "Python",
  "Java",
  "Go",
  "Ruby",
  "PHP",
  "C#",
  ".NET",
  "SQL",
  "PostgreSQL",
  "MySQL",
  "MongoDB",
  "Redis",
  "GraphQL",
  "REST API",
  "HTML",
  "CSS",
  "Tailwind",
  "Docker",
  "Kubernetes",
  "Terraform",
  "AWS",
  "GCP",
  "Azure",
  "Git",
  "CI/CD",
  "Linux",
  "Bash",
  "Kafka",
  "Spark",
  "Airflow",
  "dbt",
  "Snowflake",
  "Elasticsearch",
  "Figma",
  "UX",
  "UI",
  "Machine Learning",
  "LLM",
  "TensorFlow",
  "PyTorch",
]

const LOCATION_CONTEXT_PATTERNS = [
  /(?:job\s+)?locations?\s*[:\-]\s*([^.|\n]{1,220})/gi,
  /(?:job\s+)?locations?\s+(?:include|are|is)\s+([^.|\n]{1,220})/gi,
  /(?:cities|countries)\s*[:\-]\s*([^.|\n]{1,220})/gi,
  /(?:applicant location requirements?|candidate locations?)\s*[:\-]\s*([^.|\n]{1,220})/gi,
  /(?:based|located|hiring|working|work|remote(?:ly)?|available)\s+(?:in|from|across|within)\s+([^.|\n]{1,220})/gi,
  /(?:remote|hybrid|onsite)\s*[:\-]\s*([^.|\n]{1,220})/gi,
  /(?:must|should|can)\s+be\s+(?:based|located)\s+(?:in|from)\s+([^.|\n]{1,220})/gi,
  /(?:eligible|authorized)\s+to\s+work\s+in\s+([^.|\n]{1,220})/gi,
  /(?:office|offices|hub|hubs|team|teams)\s+(?:in|across)\s+([^.|\n]{1,220})/gi,
]

type LocationCatalogEntry = {
  label: string
  aliases: string[]
  cities?: Array<{
    label: string
    aliases: string[]
  }>
}

const LOCATION_CATALOG: LocationCatalogEntry[] = [
  {
    label: "Australie",
    aliases: ["Australie", "Australia"],
    cities: [
      { label: "Sydney", aliases: ["Sydney"] },
      { label: "Melbourne", aliases: ["Melbourne"] },
      { label: "Brisbane", aliases: ["Brisbane"] },
      { label: "Perth", aliases: ["Perth"] },
      { label: "Adelaide", aliases: ["Adelaide"] },
    ],
  },
  {
    label: "Dubai",
    aliases: ["Dubai", "Dubayy", "UAE", "U.A.E.", "United Arab Emirates"],
  },
  {
    label: "UK",
    aliases: ["UK", "U.K.", "United Kingdom", "Royaume Uni", "Great Britain", "Britain"],
    cities: [
      { label: "London", aliases: ["London"] },
      { label: "Manchester", aliases: ["Manchester"] },
      { label: "Birmingham", aliases: ["Birmingham"] },
      { label: "Edinburgh", aliases: ["Edinburgh"] },
      { label: "Glasgow", aliases: ["Glasgow"] },
    ],
  },
  {
    label: "US",
    aliases: [
      "US",
      "U.S.",
      "USA",
      "U.S.A.",
      "United States",
      "United States of America",
      "Etats Unis",
    ],
    cities: [
      { label: "New York", aliases: ["New York", "NYC"] },
      { label: "San Francisco", aliases: ["San Francisco"] },
      { label: "Los Angeles", aliases: ["Los Angeles"] },
      { label: "Chicago", aliases: ["Chicago"] },
      { label: "Seattle", aliases: ["Seattle"] },
      { label: "Austin", aliases: ["Austin"] },
      { label: "Boston", aliases: ["Boston"] },
    ],
  },
  {
    label: "Colombie",
    aliases: ["Colombie", "Colombia"],
    cities: [
      { label: "Bogota", aliases: ["Bogota", "Bogotá"] },
      { label: "Medellin", aliases: ["Medellin", "Medellín"] },
      { label: "Cali", aliases: ["Cali"] },
      { label: "Barranquilla", aliases: ["Barranquilla"] },
    ],
  },
  {
    label: "Costa Rica",
    aliases: ["Costa Rica"],
    cities: [
      { label: "San Jose", aliases: ["San Jose", "San José"] },
      { label: "Heredia", aliases: ["Heredia"] },
      { label: "Cartago", aliases: ["Cartago"] },
      { label: "Alajuela", aliases: ["Alajuela"] },
    ],
  },
  {
    label: "Allemagne",
    aliases: ["Allemagne", "Germany", "Deutschland"],
    cities: [
      { label: "Berlin", aliases: ["Berlin"] },
      { label: "Munich", aliases: ["Munich", "Muenchen", "München"] },
      { label: "Hamburg", aliases: ["Hamburg"] },
      { label: "Frankfurt", aliases: ["Frankfurt"] },
      { label: "Cologne", aliases: ["Cologne", "Koln", "Köln"] },
    ],
  },
  {
    label: "Indonesie",
    aliases: ["Indonesie", "Indonésie", "Indonesia", "Idonesie", "Idonésie"],
    cities: [
      { label: "Jakarta", aliases: ["Jakarta"] },
      { label: "Surabaya", aliases: ["Surabaya"] },
      { label: "Bandung", aliases: ["Bandung"] },
      { label: "Denpasar", aliases: ["Denpasar"] },
      { label: "Yogyakarta", aliases: ["Yogyakarta", "Jogja"] },
    ],
  },
  {
    label: "Chine",
    aliases: ["Chine", "China"],
    cities: [
      { label: "Beijing", aliases: ["Beijing", "Pekin", "Pékin"] },
      { label: "Shanghai", aliases: ["Shanghai"] },
      { label: "Shenzhen", aliases: ["Shenzhen"] },
      { label: "Guangzhou", aliases: ["Guangzhou"] },
      { label: "Hong Kong", aliases: ["Hong Kong"] },
    ],
  },
  {
    label: "Japon",
    aliases: ["Japon", "Japan"],
    cities: [
      { label: "Tokyo", aliases: ["Tokyo"] },
      { label: "Osaka", aliases: ["Osaka"] },
      { label: "Kyoto", aliases: ["Kyoto"] },
      { label: "Fukuoka", aliases: ["Fukuoka"] },
      { label: "Yokohama", aliases: ["Yokohama"] },
    ],
  },
  {
    label: "Taiwan",
    aliases: ["Taiwan"],
    cities: [
      { label: "Taipei", aliases: ["Taipei"] },
      { label: "Taichung", aliases: ["Taichung"] },
      { label: "Tainan", aliases: ["Tainan"] },
      { label: "Kaohsiung", aliases: ["Kaohsiung"] },
    ],
  },
  {
    label: "Norvege",
    aliases: ["Norvege", "Norvège", "Norway"],
    cities: [
      { label: "Oslo", aliases: ["Oslo"] },
      { label: "Bergen", aliases: ["Bergen"] },
      { label: "Trondheim", aliases: ["Trondheim"] },
    ],
  },
  {
    label: "Finlande",
    aliases: ["Finlande", "Findlande", "Finland"],
    cities: [
      { label: "Helsinki", aliases: ["Helsinki"] },
      { label: "Tampere", aliases: ["Tampere"] },
      { label: "Turku", aliases: ["Turku"] },
    ],
  },
  {
    label: "Canada",
    aliases: ["Canada"],
    cities: [
      { label: "Toronto", aliases: ["Toronto"] },
      { label: "Montreal", aliases: ["Montreal", "Montréal"] },
      { label: "Vancouver", aliases: ["Vancouver"] },
      { label: "Calgary", aliases: ["Calgary"] },
      { label: "Ottawa", aliases: ["Ottawa"] },
    ],
  },
  {
    label: "Mexique",
    aliases: ["Mexique", "Mexico"],
    cities: [
      { label: "Mexico City", aliases: ["Mexico City", "Ciudad de Mexico", "Ciudad de México"] },
      { label: "Guadalajara", aliases: ["Guadalajara"] },
      { label: "Monterrey", aliases: ["Monterrey"] },
    ],
  },
]

export function normalizeJobPostUrl(url: string): string | null {
  const trimmed = url.trim()
  if (!trimmed) return null

  try {
    const parsed = new URL(trimmed)
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null
    return parsed.toString()
  } catch {
    return null
  }
}

export async function fetchJobPostMetadata(
  url: string
): Promise<JobPostMetadataResult | null> {
  const normalizedUrl = normalizeJobPostUrl(url)
  if (!normalizedUrl) return null

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 8000)

  try {
    const response = await fetch(normalizedUrl, {
      cache: "no-store",
      headers: REQUEST_HEADERS,
      redirect: "follow",
      signal: controller.signal,
    })

    if (!response.ok) {
      return createFailedResult(
        normalizedUrl,
        `Fetch failed with status ${response.status}`
      )
    }

    const contentType = response.headers.get("content-type") ?? ""
    if (!contentType.includes("text/html")) {
      return createFailedResult(
        normalizedUrl,
        `Unsupported content type: ${contentType || "unknown"}`
      )
    }

    const html = (await response.text()).slice(0, 400_000)
    return extractJobPostMetadataFromHtml(normalizedUrl, html)
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown metadata fetch error"
    return createFailedResult(normalizedUrl, message)
  } finally {
    clearTimeout(timeoutId)
  }
}

function extractJobPostMetadataFromHtml(
  sourceUrl: string,
  html: string
): JobPostMetadataResult {
  const title = extractTitle(html)
  const metaDescription =
    extractMetaContent(html, "description") ||
    extractMetaContent(html, "og:description")
  const plainText = extractPlainText(html)
  const structuredJobPosting = extractStructuredJobPosting(html)

  const salaryText =
    extractSalaryFromStructuredData(structuredJobPosting) ??
    findSalaryInText(`${metaDescription}\n${plainText}`)
  const locationSearchText = [
    title,
    metaDescription,
    ...extractLocationContextSnippets(plainText),
  ]
    .filter(Boolean)
    .join("\n")
  const locations = uniqueValues([
    ...extractLocationsFromStructuredData(structuredJobPosting),
    ...findLocationHints(locationSearchText),
  ]).slice(0, 6)
  const skills = uniqueValues([
    ...extractSkillsFromStructuredData(structuredJobPosting),
    ...findSkillsInText(`${title}\n${metaDescription}\n${plainText}`),
  ]).slice(0, 15)

  const extractedFieldCount = [
    salaryText ? 1 : 0,
    locations.length > 0 ? 1 : 0,
    skills.length > 0 ? 1 : 0,
  ].reduce((sum, count) => sum + count, 0)

  if (extractedFieldCount === 0) {
    return {
      sourceUrl,
      sourceTitle: title,
      salaryText: "",
      locations: [],
      skills: [],
      extractionStatus: "failed",
      extractionError: "No salary, location, or skills could be extracted",
      fetchedAt: new Date(),
    }
  }

  return {
    sourceUrl,
    sourceTitle: title,
    salaryText: salaryText ?? "",
    locations,
    skills,
    extractionStatus: extractedFieldCount >= 2 ? "success" : "partial",
    extractionError: "",
    fetchedAt: new Date(),
  }
}

function createFailedResult(
  sourceUrl: string,
  extractionError: string
): JobPostMetadataResult {
  return {
    sourceUrl,
    sourceTitle: "",
    salaryText: "",
    locations: [],
    skills: [],
    extractionStatus: "failed",
    extractionError,
    fetchedAt: new Date(),
  }
}

function extractStructuredJobPosting(html: string): Record<string, unknown> | null {
  const matches = html.matchAll(
    /<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
  )

  for (const match of matches) {
    const parsed = parseJsonLd(match[1] ?? "")
    if (!parsed) continue

    const jobPosting = findJobPostingNode(parsed)
    if (jobPosting) return jobPosting
  }

  return null
}

function parseJsonLd(input: string): unknown {
  const cleaned = decodeHtmlEntities(
    input.replace(/^\s*<!--/, "").replace(/-->\s*$/, "").trim()
  )

  if (!cleaned) return null

  try {
    return JSON.parse(cleaned)
  } catch {
    return null
  }
}

function findJobPostingNode(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object") return null

  if (Array.isArray(value)) {
    for (const item of value) {
      const match = findJobPostingNode(item)
      if (match) return match
    }
    return null
  }

  const record = value as Record<string, unknown>
  const types = asStringArray(record["@type"]).map((type) => type.toLowerCase())
  if (types.includes("jobposting")) return record

  for (const nested of Object.values(record)) {
    const match = findJobPostingNode(nested)
    if (match) return match
  }

  return null
}

function extractSalaryFromStructuredData(
  jobPosting: Record<string, unknown> | null
): string | null {
  if (!jobPosting) return null

  const baseSalary = jobPosting.baseSalary
  if (typeof baseSalary === "string") return cleanText(baseSalary)
  if (!baseSalary || typeof baseSalary !== "object") return null

  const salaryRecord = baseSalary as Record<string, unknown>
  const directValue = salaryRecord.value
  const currency =
    asString(salaryRecord.currency) ??
    (directValue && typeof directValue === "object"
      ? asString((directValue as Record<string, unknown>).currency)
      : null)
  const unit =
    asString(salaryRecord.unitText) ??
    (directValue && typeof directValue === "object"
      ? asString((directValue as Record<string, unknown>).unitText)
      : null)

  if (typeof directValue === "number") {
    return formatSalaryRange(currency, directValue, undefined, unit)
  }

  if (!directValue || typeof directValue !== "object") return null

  const valueRecord = directValue as Record<string, unknown>
  const minValue = asNumber(valueRecord.minValue)
  const maxValue = asNumber(valueRecord.maxValue)
  const singleValue = asNumber(valueRecord.value)

  if (minValue !== null || maxValue !== null) {
    return formatSalaryRange(currency, minValue, maxValue, unit)
  }

  if (singleValue !== null) {
    return formatSalaryRange(currency, singleValue, undefined, unit)
  }

  return null
}

function extractLocationsFromStructuredData(
  jobPosting: Record<string, unknown> | null
): string[] {
  if (!jobPosting) return []

  const fragments: string[] = []
  collectLocationStrings(jobPosting.jobLocation, fragments)
  collectLocationStrings(jobPosting.applicantLocationRequirements, fragments)

  return detectKnownLocations(fragments.join("\n"))
}

function collectLocationStrings(value: unknown, fragments: string[]) {
  if (!value) return

  if (Array.isArray(value)) {
    for (const item of value) collectLocationStrings(item, fragments)
    return
  }

  if (typeof value === "string") {
    fragments.push(cleanText(value))
    return
  }

  if (typeof value !== "object") return

  const record = value as Record<string, unknown>
  const locality = asString(record.addressLocality)
  const country = asString(record.addressCountry)
  const name = asString(record.name)

  if (locality) fragments.push(locality)
  if (country) fragments.push(country)
  if (name && !locality && !country) fragments.push(name)

  if (record.address && typeof record.address === "object") {
    const address = record.address as Record<string, unknown>
    const locality = asString(address.addressLocality)
    const country = asString(address.addressCountry)

    if (locality) fragments.push(locality)
    if (country) fragments.push(country)
  }
}

function extractSkillsFromStructuredData(
  jobPosting: Record<string, unknown> | null
): string[] {
  if (!jobPosting) return []

  const candidates = [
    jobPosting.skills,
    jobPosting.qualifications,
    jobPosting.experienceRequirements,
    jobPosting.responsibilities,
    jobPosting.description,
  ]

  const values = new Set<string>()
  for (const candidate of candidates) {
    for (const skill of collectSkills(candidate)) values.add(skill)
  }

  return [...values]
}

function collectSkills(value: unknown): string[] {
  if (!value) return []
  if (Array.isArray(value)) return uniqueValues(value.flatMap(collectSkills))
  if (typeof value === "string") return splitSkills(value)
  if (typeof value !== "object") return []

  const record = value as Record<string, unknown>
  return uniqueValues(
    Object.values(record).flatMap((nested) => collectSkills(nested))
  )
}

function splitSkills(value: string): string[] {
  const cleaned = cleanText(value)
  if (!cleaned) return []

  if (cleaned.length <= 120 && /,|\/|\||•|·|\n/.test(value)) {
    return uniqueValues(
      cleaned
        .split(/,|\/|\||•|·|\n/)
        .map((part) => cleanText(part))
        .filter((part) => isLikelySkill(part))
    )
  }

  return findSkillsInText(cleaned)
}

function findSalaryInText(text: string): string | null {
  const normalized = text.replace(/\s+/g, " ")
  const patterns = [
    /(?:\$|€|£)\s?\d[\d,. ]{1,12}(?:k|K)?\s*(?:-|to|–|—)\s*(?:\$|€|£)?\s?\d[\d,. ]{1,12}(?:k|K)?(?:\s*(?:per|\/)\s*(?:year|yr|month|mo|hour|hr|day|week|annum))?/i,
    /(?:USD|EUR|GBP)\s?\d[\d,. ]{1,12}(?:k|K)?\s*(?:-|to|–|—)\s*(?:USD|EUR|GBP)?\s?\d[\d,. ]{1,12}(?:k|K)?(?:\s*(?:per|\/)\s*(?:year|yr|month|mo|hour|hr|day|week|annum))?/i,
    /(?:salary|compensation|pay range|base salary)\s*[:\-]?\s*[^.]{8,100}/i,
  ]

  for (const pattern of patterns) {
    const match = normalized.match(pattern)
    if (match?.[0]) return cleanText(match[0])
  }

  return null
}

function findLocationHints(text: string): string[] {
  if (!text) return []
  return detectKnownLocations(text)
}

function findSkillsInText(text: string): string[] {
  const values = new Set<string>()

  for (const skill of COMMON_SKILLS) {
    const escaped = skill.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
    const pattern = new RegExp(`(^|[^A-Za-z0-9+.#-])${escaped}([^A-Za-z0-9+.#-]|$)`, "i")
    if (pattern.test(text)) values.add(skill)
  }

  return [...values]
}

function extractTitle(html: string): string {
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)
  const title = cleanText(decodeHtmlEntities(match?.[1] ?? ""))
  return title || extractMetaContent(html, "og:title")
}

function extractMetaContent(html: string, name: string): string {
  const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
  const patterns = [
    new RegExp(
      `<meta[^>]+(?:name|property)=["']${escapedName}["'][^>]+content=["']([^"']*)["'][^>]*>`,
      "i"
    ),
    new RegExp(
      `<meta[^>]+content=["']([^"']*)["'][^>]+(?:name|property)=["']${escapedName}["'][^>]*>`,
      "i"
    ),
  ]

  for (const pattern of patterns) {
    const match = html.match(pattern)
    if (match?.[1]) return cleanText(decodeHtmlEntities(match[1]))
  }

  return ""
}

function extractPlainText(html: string): string {
  const withoutNoise = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
  const text = withoutNoise.replace(/<[^>]+>/g, " ")
  return cleanText(decodeHtmlEntities(text)).slice(0, 120_000)
}

function formatSalaryRange(
  currency: string | null,
  minValue: number | null,
  maxValue: number | null | undefined,
  unit: string | null
): string | null {
  if (minValue === null && (maxValue === undefined || maxValue === null)) {
    return null
  }

  const prefix = currency ? `${currencySymbol(currency)} ` : ""
  const minText = minValue === null ? "" : formatCompactNumber(minValue)
  const maxText =
    maxValue === undefined || maxValue === null ? "" : formatCompactNumber(maxValue)
  const range = maxText ? `${minText} - ${maxText}` : minText
  const suffix = unit ? ` / ${cleanText(unit)}` : ""

  return cleanText(`${prefix}${range}${suffix}`)
}

function formatCompactNumber(value: number): string {
  if (!Number.isFinite(value)) return ""

  if (Math.abs(value) >= 1000) {
    const compact = value >= 100000
      ? Math.round(value / 1000)
      : Math.round((value / 1000) * 10) / 10
    return `${compact}k`
  }

  return `${value}`
}

function currencySymbol(currency: string): string {
  const normalized = currency.trim().toUpperCase()
  if (normalized === "USD") return "$"
  if (normalized === "EUR") return "EUR"
  if (normalized === "GBP") return "GBP"
  return normalized
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null
}

function asStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.flatMap((item) => (typeof item === "string" ? [item] : []))
  }

  return typeof value === "string" ? [value] : []
}

function asNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null
}

function isLikelySkill(value: string): boolean {
  if (!value) return false
  if (value.length > 40) return false
  return /\b[A-Za-z][A-Za-z0-9+.#/\- ]+\b/.test(value)
}

function detectKnownLocations(text: string): string[] {
  const normalizedText = ` ${normalizeLocationLookup(text)} `
  const results: string[] = []

  for (const entry of LOCATION_CATALOG) {
    const countryMatched = entry.aliases.some((alias) =>
      locationAliasMatches(text, normalizedText, alias)
    )

    const matchedCities =
      entry.cities?.filter((city) =>
        city.aliases.some((alias) => locationAliasMatches(text, normalizedText, alias))
      ) ?? []

    if (countryMatched || matchedCities.length > 0) {
      results.push(entry.label)
    }

    for (const city of matchedCities) {
      results.push(city.label)
    }
  }

  return uniqueValues(results)
}

function locationAliasMatches(
  rawText: string,
  normalizedText: string,
  alias: string
) {
  if (/^[A-Z]{2,3}$/.test(alias)) {
    const escaped = alias.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
    return new RegExp(`\\b${escaped}\\b`).test(rawText)
  }

  const normalizedAlias = normalizeLocationLookup(alias)
  if (!normalizedAlias) return false

  return normalizedText.includes(` ${normalizedAlias} `)
}

function extractLocationContextSnippets(text: string): string[] {
  const cleanedText = cleanText(text)
  if (!cleanedText) return []

  const snippets = new Set<string>()

  for (const pattern of LOCATION_CONTEXT_PATTERNS) {
    pattern.lastIndex = 0
    for (const match of cleanedText.matchAll(pattern)) {
      const snippet = cleanText(match[1] ?? "")
      if (snippet) snippets.add(snippet)
    }
  }

  return [...snippets]
}

function normalizeLocationLookup(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, " ")
    .toLowerCase()
    .trim()
}

function cleanText(value: string): string {
  return value.replace(/\s+/g, " ").trim()
}

function decodeHtmlEntities(value: string): string {
  return value
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
}

function uniqueValues(values: string[]): string[] {
  const seen = new Set<string>()
  const result: string[] = []

  for (const value of values.map((item) => cleanText(item)).filter(Boolean)) {
    const key = value.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    result.push(value)
  }

  return result
}
