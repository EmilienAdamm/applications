"use client"

import { useMemo, useReducer } from "react"

import {
  addApplication,
  deleteApplication,
  importApplications,
  type ParsedImportRow,
  updateApplicationField,
} from "@/app/app/actions"
import { ApplicationsTab } from "@/components/job-tracker/applications-tab"
import { trackerReducer } from "@/lib/job-tracker/reducer"
import type {
  ApplicationFieldKey,
  JobApplication,
  NewApplicationForm,
  TrackerOptions,
} from "@/lib/job-tracker/types"

function containsInterview(status: string) {
  return /(interview|entretien)/i.test(status)
}

interface ApplicationsPageProps {
  initialApplications: JobApplication[]
  initialOptions: TrackerOptions
}

export function ApplicationsPage({
  initialApplications,
  initialOptions,
}: ApplicationsPageProps) {
  const [state, dispatch] = useReducer(trackerReducer, {
    applications: initialApplications,
    options: initialOptions,
  })

  const stats = useMemo(() => {
    const total = state.applications.length
    const interviews = state.applications.filter((application) =>
      containsInterview(application.status)
    ).length
    const offers = state.applications.filter(
      (application) => application.finalStatus === "OFFER"
    ).length
    return { total, interviews, offers }
  }, [state.applications])

  async function handleAddApplication(form: NewApplicationForm) {
    const id = await addApplication(form)
    dispatch({ type: "add_application", payload: { ...form, id } })
  }

  async function handleDeleteApplication(id: string) {
    dispatch({ type: "remove_application", payload: { id } })
    await deleteApplication(id)
  }

  async function handleUpdateApplicationField(
    id: string,
    field: ApplicationFieldKey,
    value: string
  ) {
    dispatch({ type: "update_application_field", payload: { id, field, value } })
    await updateApplicationField(id, field, value)
  }

  async function handleImport(file: File) {
    const XLSX = await import("xlsx")

    const buffer = await file.arrayBuffer()
    const wb = XLSX.read(buffer, { type: "buffer", cellDates: true })
    const sheet = wb.Sheets[wb.SheetNames[0]]
    const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
      raw: true,
      defval: "",
    })

    if (rawRows.length === 0) return

    const HEADER_MAP: Record<string, keyof ParsedImportRow> = {
      "company name": "companyName",
      "job position": "jobPosition",
      "date of application": "dateOfApplication",
      "job offer link": "jobOfferLink",
      "cv used": "cvUsed",
      "email used": "emailUsed",
      "status": "status",
      "final status": "finalStatus",
    }

    const REQUIRED = new Set(["company name", "job position", "date of application"])
    const headerKeys = Object.keys(rawRows[0]).map((key) => key.toLowerCase().trim())
    const missingRequired = [...REQUIRED].filter((required) => !headerKeys.includes(required))

    if (missingRequired.length > 0) {
      alert(`Import failed: missing required columns: ${missingRequired.join(", ")}`)
      return
    }

    function parseDate(value: unknown): string {
      if (value instanceof Date) return value.toISOString().slice(0, 10)
      if (typeof value === "number") {
        return new Date((value - 25569) * 86400 * 1000).toISOString().slice(0, 10)
      }
      return String(value ?? "").slice(0, 10)
    }

    const parsedRows: ParsedImportRow[] = rawRows.map((raw) => {
      const normalized: Record<string, unknown> = {}
      for (const [key, val] of Object.entries(raw)) {
        const mappedKey = HEADER_MAP[key.toLowerCase().trim()]
        if (mappedKey) normalized[mappedKey] = val
      }

      return {
        companyName: String(normalized.companyName ?? ""),
        jobPosition: String(normalized.jobPosition ?? ""),
        dateOfApplication: parseDate(normalized.dateOfApplication),
        jobOfferLink: String(normalized.jobOfferLink ?? ""),
        cvUsed: String(normalized.cvUsed ?? ""),
        emailUsed: String(normalized.emailUsed ?? ""),
        status: String(normalized.status ?? ""),
        finalStatus: String(normalized.finalStatus ?? ""),
      }
    })

    const result = await importApplications(parsedRows)
    dispatch({
      type: "bulk_import",
      payload: {
        applications: result.insertedApplications.map((application) => ({
          id: application.id,
          companyName: application.companyName,
          jobPosition: application.jobPosition,
          dateOfApplication: application.dateOfApplication,
          jobOfferLink: application.jobOfferLink,
          cvUsed: application.cvUsed,
          emailUsed: application.emailUsed,
          status: application.status,
          finalStatus: application.finalStatus,
        })),
        newOptions: result.insertedOptions,
      },
    })
  }

  async function handleExport() {
    const XLSX = await import("xlsx")

    const rows = state.applications.map((application) => ({
      "Company Name": application.companyName,
      "Job Position": application.jobPosition,
      "Date of Application": application.dateOfApplication,
      "Job Offer Link": application.jobOfferLink,
      "CV Used": application.cvUsed,
      "Email Used": application.emailUsed,
      Status: application.status,
      "Final Status": application.finalStatus,
    }))

    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "Applications")
    XLSX.writeFile(wb, "applications.xlsx")
  }

  return (
    <ApplicationsTab
      applications={state.applications}
      options={state.options}
      stats={stats}
      onAddApplication={handleAddApplication}
      onDeleteApplication={handleDeleteApplication}
      onUpdateApplicationField={handleUpdateApplicationField}
      onImport={handleImport}
      onExport={handleExport}
    />
  )
}
