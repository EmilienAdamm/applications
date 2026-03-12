export type AppTab = "applications" | "analysis" | "settings"

export type OptionCategory = "cvUsed" | "emailUsed" | "status" | "finalStatus"

/** Any CSS hex color (#rrggbb) OR one of the preset names below. */
export type OptionColor = string

export const PRESET_COLORS = [
  "sky",
  "red",
  "emerald",
  "violet",
  "cyan",
  "amber",
  "zinc",
] as const

/** @deprecated Use PRESET_COLORS. Kept for backwards compat. */
export const OPTION_COLORS: readonly string[] = PRESET_COLORS

export interface UserOption {
  id: string
  value: string
  color: OptionColor
  sortOrder: number
}

export interface TrackerOptions {
  cvUsed: UserOption[]
  emailUsed: UserOption[]
  status: UserOption[]
  finalStatus: UserOption[]
}

export interface JobApplication {
  id: string
  companyName: string
  jobPosition: string
  dateOfApplication: string
  jobOfferLink: string
  cvUsed: string
  emailUsed: string
  status: string
  finalStatus: string
}

export type JobApplicationMetadataStatus =
  | "queued"
  | "processing"
  | "success"
  | "partial"
  | "failed"

export interface JobApplicationMetadata {
  applicationId: string
  sourceUrl: string
  sourceTitle: string
  salaryText: string
  locations: string[]
  skills: string[]
  extractionStatus: JobApplicationMetadataStatus
  extractionError: string
  fetchedAt: string
}

export interface TrackerSettings {
  deeperSearchEnabled: boolean
}

export interface NewApplicationForm {
  companyName: string
  jobPosition: string
  dateOfApplication: string
  jobOfferLink: string
  cvUsed: string
  emailUsed: string
  status: string
  finalStatus: string
}

export interface TrackerState {
  applications: JobApplication[]
  options: TrackerOptions
}

export interface TrackerStats {
  total: number
  interviews: number
  offers: number
}

export type ApplicationFieldKey = Exclude<keyof JobApplication, "id">

export type TrackerAction =
  | {
      type: "add_application"
      payload: NewApplicationForm & { id: string }
    }
  | {
      type: "remove_application"
      payload: { id: string }
    }
  | {
      type: "update_application_field"
      payload: {
        id: string
        field: ApplicationFieldKey
        value: string
      }
    }
  | {
      type: "add_option"
      payload: {
        category: OptionCategory
        option: UserOption
      }
    }
  | {
      type: "rename_option"
      payload: {
        category: OptionCategory
        id: string
        currentValue: string
        nextValue: string
        nextColor: string
      }
    }
  | {
      type: "delete_option"
      payload: {
        category: OptionCategory
        id: string
        value: string
      }
    }
  | {
      type: "bulk_import"
      payload: {
        applications: JobApplication[]
        newOptions: Array<{ category: OptionCategory; option: UserOption }>
      }
    }
