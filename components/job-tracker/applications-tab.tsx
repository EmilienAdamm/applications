"use client"

import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronDown,
  ChevronUp,
  Download,
  ExternalLink,
  Search,
  Trash2,
  Upload,
} from "lucide-react"
import { useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react"

import { StatCard } from "@/components/job-tracker/stat-card"
import { Button } from "@/components/ui/button"
import { buildDefaultForm } from "@/lib/job-tracker/default-data"
import type {
  ApplicationFieldKey,
  JobApplication,
  NewApplicationForm,
  TrackerOptions,
  TrackerStats,
} from "@/lib/job-tracker/types"
import {
  getBadgeProps,
  getNeutralBadgeClass,
} from "@/lib/job-tracker/value-colors"
import { cn } from "@/lib/utils"

type SortDirection = "asc" | "desc" | null

interface ApplicationsTabProps {
  applications: JobApplication[]
  options: TrackerOptions
  stats: TrackerStats
  onAddApplication: (form: NewApplicationForm) => void
  onDeleteApplication: (id: string) => void
  onUpdateApplicationField: (
    id: string,
    field: ApplicationFieldKey,
    value: string
  ) => void
  onImport: (file: File) => Promise<void>
  onExport: () => void
}

type ColumnType = "text" | "date" | "url" | "cvUsed" | "emailUsed" | "status" | "finalStatus"

interface TableColumn {
  key: ApplicationFieldKey
  label: string
  type: ColumnType
  defaultWidth: number
}

const TABLE_COLUMNS: TableColumn[] = [
  { key: "companyName",       label: "Company Name",        type: "text",        defaultWidth: 200 },
  { key: "jobPosition",       label: "Job Position",        type: "text",        defaultWidth: 440 },
  { key: "dateOfApplication", label: "Date of Application", type: "date",        defaultWidth: 170 },
  { key: "jobOfferLink",      label: "Job Offer Link",      type: "url",         defaultWidth: 170 },
  { key: "cvUsed",            label: "CV Used",             type: "cvUsed",      defaultWidth: 140 },
  { key: "emailUsed",         label: "Email Used",          type: "emailUsed",   defaultWidth: 190 },
  { key: "status",            label: "Status",              type: "status",      defaultWidth: 170 },
  { key: "finalStatus",       label: "Final Status",        type: "finalStatus", defaultWidth: 160 },
]

const CENTER_ALIGNED_COLUMNS = new Set<ApplicationFieldKey>([
  "companyName",
  "cvUsed",
  "emailUsed",
  "status",
  "finalStatus",
])

function getSafeOptionValue(options: { value: string }[], selected: string) {
  if (options.some((o) => o.value === selected)) return selected
  return options[0]?.value ?? ""
}

function compareValues(left: string, right: string) {
  return left.localeCompare(right, undefined, {
    numeric: true,
    sensitivity: "base",
  })
}

function isCenterAlignedColumn(field: ApplicationFieldKey) {
  return CENTER_ALIGNED_COLUMNS.has(field)
}

function sortIcon(direction: SortDirection) {
  if (direction === "asc") {
    return <ArrowUp className="size-3.5" />
  }
  if (direction === "desc") {
    return <ArrowDown className="size-3.5" />
  }
  return <ArrowUpDown className="size-3.5 opacity-50" />
}

export function ApplicationsTab({
  applications,
  options,
  stats,
  onAddApplication,
  onDeleteApplication,
  onUpdateApplicationField,
  onImport,
  onExport,
}: ApplicationsTabProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [form, setForm] = useState<NewApplicationForm>(() =>
    buildDefaultForm(options)
  )
  const [isAddLineOpen, setIsAddLineOpen] = useState(false)
  const [editingCell, setEditingCell] = useState<{
    id: string
    field: ApplicationFieldKey
  } | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [visibleColumns, setVisibleColumns] = useState<
    Record<ApplicationFieldKey, boolean>
  >(() =>
    TABLE_COLUMNS.reduce(
      (accumulator, column) => {
        accumulator[column.key] = true
        return accumulator
      },
      {} as Record<ApplicationFieldKey, boolean>
    )
  )
  const [columnWidths, setColumnWidths] = useState<
    Record<ApplicationFieldKey, number>
  >(() =>
    TABLE_COLUMNS.reduce(
      (accumulator, column) => {
        accumulator[column.key] = column.defaultWidth
        return accumulator
      },
      {} as Record<ApplicationFieldKey, number>
    )
  )
  const [sortState, setSortState] = useState<{
    field: ApplicationFieldKey | null
    direction: SortDirection
  }>({
    field: null,
    direction: null,
  })
  const visibleTableColumns = useMemo(
    () => TABLE_COLUMNS.filter((column) => visibleColumns[column.key]),
    [visibleColumns]
  )

  const orderedApplications = useMemo(() => {
    const sortField = sortState.field
    const sortDirection = sortState.direction

    if (!sortField || !sortDirection) {
      return applications
    }

    const sorted = [...applications].sort((left, right) => {
      const leftValue = (left[sortField] ?? "").trim()
      const rightValue = (right[sortField] ?? "").trim()
      const result = compareValues(leftValue, rightValue)

      return sortDirection === "asc" ? result : -result
    })

    return sorted
  }, [applications, sortState])

  const filteredApplications = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase()
    if (!normalizedQuery) {
      return orderedApplications
    }

    return orderedApplications.filter((application) => {
      const companyName = application.companyName.toLowerCase()
      const jobPosition = application.jobPosition.toLowerCase()
      return (
        companyName.includes(normalizedQuery) ||
        jobPosition.includes(normalizedQuery)
      )
    })
  }, [orderedApplications, searchQuery])

  function toggleSort(field: ApplicationFieldKey) {
    setSortState((previous) => {
      if (previous.field !== field) {
        return { field, direction: "asc" }
      }
      if (previous.direction === "asc") {
        return { field, direction: "desc" }
      }
      if (previous.direction === "desc") {
        return { field: null, direction: null }
      }
      return { field, direction: "asc" }
    })
  }

  function startResize(field: ApplicationFieldKey, event: ReactPointerEvent) {
    event.preventDefault()
    event.stopPropagation()

    const startX = event.clientX
    const startWidth = columnWidths[field] ?? 150
    document.body.style.userSelect = "none"
    document.body.style.cursor = "col-resize"

    function onPointerMove(moveEvent: PointerEvent) {
      const delta = moveEvent.clientX - startX
      const nextWidth = Math.max(120, startWidth + delta)
      setColumnWidths((previous) => ({
        ...previous,
        [field]: nextWidth,
      }))
    }

    function onPointerUp() {
      document.body.style.userSelect = ""
      document.body.style.cursor = ""
      window.removeEventListener("pointermove", onPointerMove)
      window.removeEventListener("pointerup", onPointerUp)
    }

    window.addEventListener("pointermove", onPointerMove)
    window.addEventListener("pointerup", onPointerUp)
  }

  function commitCellValue(
    applicationId: string,
    field: ApplicationFieldKey,
    value: string
  ) {
    onUpdateApplicationField(applicationId, field, value)
    setEditingCell(null)
  }

  function beginEdit(applicationId: string, field: ApplicationFieldKey) {
    setEditingCell({ id: applicationId, field })
  }

  function toggleColumnVisibility(field: ApplicationFieldKey) {
    const currentlyVisibleCount = TABLE_COLUMNS.reduce(
      (count, column) => count + (visibleColumns[column.key] ? 1 : 0),
      0
    )
    const isCurrentlyVisible = visibleColumns[field]

    if (isCurrentlyVisible && currentlyVisibleCount <= 1) {
      return
    }

    setVisibleColumns((previous) => ({
      ...previous,
      [field]: !previous[field],
    }))

    if (isCurrentlyVisible && sortState.field === field) {
      setSortState({ field: null, direction: null })
    }
  }

  function renderDisplayCell(application: JobApplication, column: TableColumn) {
    const value = application[column.key]
    const centered = isCenterAlignedColumn(column.key)

    if (column.type === "url") {
      return value ? (
        <a
          href={value}
          target="_blank"
          rel="noreferrer"
          onClick={(event) => event.stopPropagation()}
          className="inline-flex items-center gap-1 text-emerald-700 underline-offset-2 hover:underline dark:text-emerald-300"
        >
          Open
          <ExternalLink className="size-3.5" />
        </a>
      ) : (
        <span className="text-muted-foreground">-</span>
      )
    }

    if (
      column.type === "cvUsed" ||
      column.type === "emailUsed" ||
      column.type === "status" ||
      column.type === "finalStatus"
    ) {
      const categoryKey = column.type as keyof TrackerOptions
      const match = options[categoryKey].find((o) => o.value === value)
      const { className: badgeClass, style: badgeStyle } =
        value && match ? getBadgeProps(match.color) : { className: getNeutralBadgeClass(), style: undefined }
      return (
        <span
          className={cn(badgeClass, centered ? "mx-auto" : "")}
          style={badgeStyle}
        >
          {value || "-"}
        </span>
      )
    }

    return (
      <span
        className={cn(
          "block",
          centered ? "text-center" : "",
          column.key === "jobPosition" ? "whitespace-pre-wrap break-words" : ""
        )}
      >
        {value || "-"}
      </span>
    )
  }

  function renderEditorCell(application: JobApplication, column: TableColumn) {
    const value = application[column.key]
    const centered = isCenterAlignedColumn(column.key)

    if (
      column.type === "cvUsed" ||
      column.type === "emailUsed" ||
      column.type === "status" ||
      column.type === "finalStatus"
    ) {
      const categoryKey = column.type as keyof TrackerOptions
      return (
        <select
          autoFocus
          defaultValue={value}
          onBlur={() => setEditingCell(null)}
          onChange={(event) =>
            commitCellValue(application.id, column.key, event.target.value)
          }
          className={cn(
            "h-8 w-full rounded-md border border-zinc-300 bg-white px-2 text-xs outline-none ring-emerald-500/30 focus:ring-4 dark:border-zinc-700 dark:bg-zinc-950",
            centered ? "text-center" : ""
          )}
        >
          <option value="">-</option>
          {options[categoryKey].map((option) => (
            <option key={option.id} value={option.value}>
              {option.value}
            </option>
          ))}
        </select>
      )
    }

    return (
      <input
        autoFocus
        defaultValue={value}
        type={column.type === "date" ? "date" : column.type === "url" ? "url" : "text"}
        onBlur={(event) =>
          commitCellValue(application.id, column.key, event.currentTarget.value)
        }
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            commitCellValue(application.id, column.key, event.currentTarget.value)
          }
          if (event.key === "Escape") {
            setEditingCell(null)
          }
        }}
        className={cn(
          "h-8 w-full rounded-md border border-zinc-300 bg-white px-2 text-xs outline-none ring-emerald-500/30 focus:ring-4 dark:border-zinc-700 dark:bg-zinc-950",
          centered ? "text-center" : ""
        )}
      />
    )
  }

  return (
    <section className="space-y-4">
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard
          label="Total applications"
          value={String(stats.total)}
          hint="All lines currently in your tracker."
        />
        <StatCard
          label="Interviews"
          value={String(stats.interviews)}
          hint="Rows with an interview-related status."
        />
        <StatCard
          label="Offers"
          value={String(stats.offers)}
          hint="Rows where Final Status is OFFER."
        />
      </div>

      <div className="rounded-2xl border border-white/70 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-zinc-900/80">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold">Add line</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Form aligned with your exact Excel columns.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setIsAddLineOpen((previous) => !previous)}
            className="shrink-0"
          >
            {isAddLineOpen ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
            {isAddLineOpen ? "Hide form" : "Show form"}
          </Button>
        </div>
        {isAddLineOpen ? (
          <form
            className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4"
            onSubmit={(event) => {
              event.preventDefault()

              if (!form.companyName.trim() || !form.jobPosition.trim()) {
                return
              }

              onAddApplication({
                ...form,
                cvUsed: getSafeOptionValue(options.cvUsed, form.cvUsed),
                emailUsed: getSafeOptionValue(options.emailUsed, form.emailUsed),
                status: getSafeOptionValue(options.status, form.status),
                finalStatus: form.finalStatus
                  ? getSafeOptionValue(options.finalStatus, form.finalStatus)
                  : "",
              })


              setForm(buildDefaultForm(options))
            }}
          >
          <label className="space-y-1 text-sm md:col-span-2">
            <span className="text-muted-foreground">Company Name</span>
            <input
              required
              value={form.companyName}
              onChange={(event) =>
                setForm((previous) => ({
                  ...previous,
                  companyName: event.target.value,
                }))
              }
              className="h-9 w-full rounded-lg border border-zinc-300 bg-white px-3 outline-none ring-emerald-500/30 focus:ring-4 dark:border-zinc-700 dark:bg-zinc-950"
            />
          </label>

          <label className="space-y-1 text-sm md:col-span-2">
            <span className="text-muted-foreground">Job Position</span>
            <input
              required
              value={form.jobPosition}
              onChange={(event) =>
                setForm((previous) => ({
                  ...previous,
                  jobPosition: event.target.value,
                }))
              }
              className="h-9 w-full rounded-lg border border-zinc-300 bg-white px-3 outline-none ring-emerald-500/30 focus:ring-4 dark:border-zinc-700 dark:bg-zinc-950"
            />
          </label>

          <label className="space-y-1 text-sm">
            <span className="text-muted-foreground">Date of Application</span>
            <input
              type="date"
              value={form.dateOfApplication}
              onChange={(event) =>
                setForm((previous) => ({
                  ...previous,
                  dateOfApplication: event.target.value,
                }))
              }
              className="h-9 w-full rounded-lg border border-zinc-300 bg-white px-3 outline-none ring-emerald-500/30 focus:ring-4 dark:border-zinc-700 dark:bg-zinc-950"
            />
          </label>

          <label className="space-y-1 text-sm xl:col-span-3">
            <span className="text-muted-foreground">Job offer link</span>
            <input
              type="url"
              value={form.jobOfferLink}
              onChange={(event) =>
                setForm((previous) => ({
                  ...previous,
                  jobOfferLink: event.target.value,
                }))
              }
              className="h-9 w-full rounded-lg border border-zinc-300 bg-white px-3 outline-none ring-emerald-500/30 focus:ring-4 dark:border-zinc-700 dark:bg-zinc-950"
            />
          </label>

          <label className="space-y-1 text-sm">
            <span className="text-muted-foreground">CV used</span>
            <select
              value={getSafeOptionValue(options.cvUsed, form.cvUsed)}
              onChange={(event) =>
                setForm((previous) => ({ ...previous, cvUsed: event.target.value }))
              }
              className="h-9 w-full rounded-lg border border-zinc-300 bg-white px-3 outline-none ring-emerald-500/30 focus:ring-4 dark:border-zinc-700 dark:bg-zinc-950"
            >
              {options.cvUsed.map((opt) => (
                <option key={opt.id} value={opt.value}>{opt.value}</option>
              ))}
            </select>
          </label>

          <label className="space-y-1 text-sm">
            <span className="text-muted-foreground">Email used</span>
            <select
              value={getSafeOptionValue(options.emailUsed, form.emailUsed)}
              onChange={(event) =>
                setForm((previous) => ({ ...previous, emailUsed: event.target.value }))
              }
              className="h-9 w-full rounded-lg border border-zinc-300 bg-white px-3 outline-none ring-emerald-500/30 focus:ring-4 dark:border-zinc-700 dark:bg-zinc-950"
            >
              {options.emailUsed.map((opt) => (
                <option key={opt.id} value={opt.value}>{opt.value}</option>
              ))}
            </select>
          </label>

          <label className="space-y-1 text-sm">
            <span className="text-muted-foreground">Status</span>
            <select
              value={getSafeOptionValue(options.status, form.status)}
              onChange={(event) =>
                setForm((previous) => ({ ...previous, status: event.target.value }))
              }
              className="h-9 w-full rounded-lg border border-zinc-300 bg-white px-3 outline-none ring-emerald-500/30 focus:ring-4 dark:border-zinc-700 dark:bg-zinc-950"
            >
              {options.status.map((opt) => (
                <option key={opt.id} value={opt.value}>{opt.value}</option>
              ))}
            </select>
          </label>

          <label className="space-y-1 text-sm">
            <span className="text-muted-foreground">Final Status</span>
            <select
              value={form.finalStatus}
              onChange={(event) =>
                setForm((previous) => ({ ...previous, finalStatus: event.target.value }))
              }
              className="h-9 w-full rounded-lg border border-zinc-300 bg-white px-3 outline-none ring-emerald-500/30 focus:ring-4 dark:border-zinc-700 dark:bg-zinc-950"
            >
              <option value="">-</option>
              {options.finalStatus.map((opt) => (
                <option key={opt.id} value={opt.value}>{opt.value}</option>
              ))}
            </select>
          </label>

            <div className="md:col-span-2 xl:col-span-4">
              <Button type="submit">Save application</Button>
            </div>
          </form>
        ) : null}
      </div>

      <div className="relative rounded-2xl border border-white/70 bg-white shadow-sm dark:border-white/10 dark:bg-zinc-900/80">
        <div className="relative z-10 flex items-center justify-between border-b border-zinc-200 px-5 py-4 dark:border-zinc-800">
          <div className="flex items-center gap-3">
            <h3 className="text-lg font-semibold">Applications list</h3>
            <label className="relative">
              <Search className="pointer-events-none absolute top-1/2 left-2 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <input
                type="search"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search company or role"
                className="h-8 w-64 rounded-lg border border-zinc-300 bg-white pr-2 pl-7 text-xs outline-none ring-emerald-500/30 focus:ring-4 dark:border-zinc-700 dark:bg-zinc-950"
              />
            </label>
          </div>
          <div className="flex items-center gap-2">
            <details className="group relative">
              <summary className="flex h-8 cursor-pointer list-none items-center gap-2 rounded-lg border border-zinc-300 bg-white px-3 text-xs font-medium text-zinc-700 transition hover:border-zinc-400 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-200 dark:hover:border-zinc-600 [&::-webkit-details-marker]:hidden">
                Columns
                <ChevronDown className="size-3.5 transition group-open:rotate-180" />
              </summary>
              <div className="absolute right-0 z-20 mt-2 w-64 rounded-lg border border-zinc-200 bg-white p-2 shadow-lg dark:border-zinc-800 dark:bg-zinc-950">
                <p className="px-2 pb-2 text-xs font-medium text-zinc-600 dark:text-zinc-300">
                  Show or hide columns
                </p>
                <div className="space-y-1">
                  {TABLE_COLUMNS.map((column) => (
                    <label
                      key={column.key}
                      className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-xs hover:bg-zinc-100 dark:hover:bg-zinc-800/60"
                    >
                      <input
                        type="checkbox"
                        checked={visibleColumns[column.key]}
                        onChange={() => toggleColumnVisibility(column.key)}
                        className="size-3.5 rounded border-zinc-300 text-emerald-600 focus:ring-emerald-500 dark:border-zinc-700"
                      />
                      <span className="truncate">{column.label}</span>
                    </label>
                  ))}
                </div>
                <p className="px-2 pt-2 text-[11px] text-muted-foreground">
                  Keep at least one column visible.
                </p>
              </div>
            </details>

            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0]
                if (file) {
                  onImport(file)
                  event.target.value = ""
                }
              }}
            />
            <Button
              type="button"
              variant="outline"
              size="icon-sm"
              onClick={() => fileInputRef.current?.click()}
              title="Import .xlsx"
            >
              <Upload className="size-3.5" />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon-sm"
              onClick={onExport}
              title="Export .xlsx"
            >
              <Download className="size-3.5" />
            </Button>

            <p className="text-xs text-muted-foreground">
              Click cells to edit • resize from header edge
            </p>
          </div>
        </div>
        <div className="overflow-hidden rounded-b-2xl">
          <div className="overflow-x-auto">
            <table className="min-w-full table-fixed text-sm">
              <colgroup>
                {visibleTableColumns.map((column) => (
                  <col key={column.key} style={{ width: `${columnWidths[column.key]}px` }} />
                ))}
                <col style={{ width: "88px" }} />
              </colgroup>
              <thead className="bg-zinc-50 text-xs uppercase tracking-wide text-muted-foreground dark:bg-zinc-900/60">
                <tr>
                  {visibleTableColumns.map((column) => {
                    const isSorted = sortState.field === column.key
                    const direction = isSorted ? sortState.direction : null

                    return (
                      <th
                        key={column.key}
                        className={cn(
                          "relative border-r border-zinc-200 px-3 py-2 font-medium last:border-r-0 dark:border-zinc-800",
                          isCenterAlignedColumn(column.key) ? "text-center" : "text-left"
                        )}
                      >
                        <div
                          className={cn(
                            "flex items-center gap-1.5 pr-3",
                            isCenterAlignedColumn(column.key) ? "justify-center" : ""
                          )}
                        >
                          <button
                            type="button"
                            onClick={() => toggleSort(column.key)}
                            className="inline-flex items-center gap-1 transition hover:text-foreground"
                          >
                            <span>{column.label}</span>
                            {sortIcon(direction)}
                          </button>
                        </div>
                        <span
                          role="separator"
                          aria-label={`Resize ${column.label} column`}
                          className="absolute top-0 right-0 h-full w-2 cursor-col-resize"
                          onPointerDown={(event) => startResize(column.key, event)}
                        />
                      </th>
                    )
                  })}
                  <th className="px-5 py-3 text-center font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredApplications.length === 0 ? (
                  <tr>
                    <td
                      colSpan={visibleTableColumns.length + 1}
                      className="px-5 py-10 text-center text-muted-foreground"
                    >
                      {searchQuery.trim()
                        ? "No applications match your search."
                        : "No applications saved yet."}
                    </td>
                  </tr>
                ) : (
                  filteredApplications.map((application) => (
                    <tr
                      key={application.id}
                      className="border-t border-zinc-200 transition-colors hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900/40"
                    >
                      {visibleTableColumns.map((column) => {
                        const isEditing =
                          editingCell?.id === application.id &&
                          editingCell.field === column.key

                        return (
                          <td
                            key={`${application.id}-${column.key}`}
                            className={cn(
                              "px-3 py-2 align-top",
                              isCenterAlignedColumn(column.key) ? "text-center" : "",
                              isEditing
                                ? "bg-emerald-50/70 dark:bg-emerald-950/20"
                                : "cursor-pointer"
                            )}
                            onClick={() => {
                              if (!isEditing) {
                                beginEdit(application.id, column.key)
                              }
                            }}
                          >
                            {isEditing
                              ? renderEditorCell(application, column)
                              : renderDisplayCell(application, column)}
                          </td>
                        )
                      })}
                      <td className="px-5 py-3 text-center">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          className="text-zinc-500 hover:bg-red-100 hover:text-red-700 dark:text-zinc-400 dark:hover:bg-red-950/40 dark:hover:text-red-300"
                          onClick={() => onDeleteApplication(application.id)}
                          aria-label={`Delete ${application.companyName}`}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  )
}
