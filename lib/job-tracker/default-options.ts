import type { NewUserOption } from "@/lib/db/schema"
import type { TrackerOptions } from "@/lib/job-tracker/types"

export const DEFAULT_STATUS_VALUE = "NOT APPLIED YET"

const DEFAULT_STATUS_OPTIONS = [
  { value: DEFAULT_STATUS_VALUE, color: "zinc" },
  { value: "APPLIED", color: "sky" },
  { value: "DENIED", color: "red" },
  { value: "INTERVIEW", color: "emerald" },
] as const

export function buildDefaultUserOptions(
  userId: string,
  userEmail: string
): NewUserOption[] {
  return [
    { userId, category: "cvUsed", value: "RESUME v1", color: "zinc", sortOrder: 0 },
    { userId, category: "emailUsed", value: userEmail, color: "sky", sortOrder: 0 },
    ...DEFAULT_STATUS_OPTIONS.map((option, index) => ({
      userId,
      category: "status" as const,
      value: option.value,
      color: option.color,
      sortOrder: index,
    })),
    { userId, category: "finalStatus", value: "DENIED", color: "red", sortOrder: 0 },
    { userId, category: "finalStatus", value: "OFFER", color: "emerald", sortOrder: 1 },
  ]
}

export function normalizeStatusValue(value: string) {
  return value.trim().toUpperCase()
}

export function isNotAppliedYetStatus(value: string) {
  const normalized = normalizeStatusValue(value)
  return normalized === "" || normalized === DEFAULT_STATUS_VALUE
}

export function getDefaultStatusFormValue(options: TrackerOptions) {
  const preferred = options.status.find(
    (option) => normalizeStatusValue(option.value) === DEFAULT_STATUS_VALUE
  )
  return preferred?.value ?? options.status[0]?.value ?? ""
}

export function sortStatusOptions<T extends { value: string }>(options: T[]) {
  const desiredOrder = [
    DEFAULT_STATUS_VALUE,
    "APPLIED",
    "DENIED",
    "INTERVIEW",
  ]
  const desiredRanks = new Map(
    desiredOrder.map((value, index) => [value, index] as const)
  )

  const defaultRows: T[] = []
  for (const value of desiredOrder) {
    const match = options.find(
      (option) => normalizeStatusValue(option.value) === value
    )
    if (match) defaultRows.push(match)
  }

  const remainingRows = options.filter(
    (option) => !desiredRanks.has(normalizeStatusValue(option.value))
  )

  return [...defaultRows, ...remainingRows]
}
