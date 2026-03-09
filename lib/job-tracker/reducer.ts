import type {
  JobApplication,
  OptionCategory,
  TrackerAction,
  TrackerOptions,
  TrackerState,
  UserOption,
} from "@/lib/job-tracker/types"

const OPTION_FIELD_MAP: Record<
  OptionCategory,
  "cvUsed" | "emailUsed" | "status" | "finalStatus"
> = {
  cvUsed: "cvUsed",
  emailUsed: "emailUsed",
  status: "status",
  finalStatus: "finalStatus",
}

function normalizeForCompare(value: string) {
  return value.trim().toLowerCase()
}

function hasOption(options: UserOption[], value: string) {
  return options.some(
    (option) => normalizeForCompare(option.value) === normalizeForCompare(value)
  )
}

function replaceApplicationFieldValue(
  applications: JobApplication[],
  category: OptionCategory,
  previousValue: string,
  nextValue: string
) {
  const field = OPTION_FIELD_MAP[category]
  return applications.map((application) => {
    if (application[field] !== previousValue) {
      return application
    }
    return { ...application, [field]: nextValue }
  })
}

function sanitizeText(value: string) {
  return value.trim()
}

export function trackerReducer(
  state: TrackerState,
  action: TrackerAction
): TrackerState {
  switch (action.type) {
    case "add_application": {
      const nextApplication: JobApplication = {
        id: action.payload.id,
        companyName: sanitizeText(action.payload.companyName),
        jobPosition: sanitizeText(action.payload.jobPosition),
        dateOfApplication: action.payload.dateOfApplication,
        jobOfferLink: sanitizeText(action.payload.jobOfferLink),
        cvUsed: action.payload.cvUsed,
        emailUsed: action.payload.emailUsed,
        status: action.payload.status,
        finalStatus: action.payload.finalStatus,
      }
      return {
        ...state,
        applications: [nextApplication, ...state.applications],
      }
    }

    case "remove_application": {
      return {
        ...state,
        applications: state.applications.filter(
          (application) => application.id !== action.payload.id
        ),
      }
    }

    case "update_application_field": {
      return {
        ...state,
        applications: state.applications.map((application) => {
          if (application.id !== action.payload.id) return application
          return {
            ...application,
            [action.payload.field]: sanitizeText(action.payload.value),
          }
        }),
      }
    }

    case "add_option": {
      const optionsByCategory = state.options[action.payload.category]
      if (hasOption(optionsByCategory, action.payload.option.value)) {
        return state
      }
      const nextOptions: TrackerOptions = {
        ...state.options,
        [action.payload.category]: [
          ...optionsByCategory,
          action.payload.option,
        ],
      }
      return { ...state, options: nextOptions }
    }

    case "rename_option": {
      const { category, id, currentValue, nextValue, nextColor } = action.payload
      const sanitizedNext = sanitizeText(nextValue)
      if (!sanitizedNext) return state

      const optionsByCategory = state.options[category]
      const currentIndex = optionsByCategory.findIndex((o) => o.id === id)
      if (currentIndex < 0) return state

      if (
        hasOption(optionsByCategory, sanitizedNext) &&
        normalizeForCompare(currentValue) !== normalizeForCompare(sanitizedNext)
      ) {
        return state
      }

      const nextCategoryOptions = optionsByCategory.map((o, i) =>
        i === currentIndex ? { ...o, value: sanitizedNext, color: nextColor } : o
      )

      return {
        applications: replaceApplicationFieldValue(
          state.applications,
          category,
          currentValue,
          sanitizedNext
        ),
        options: {
          ...state.options,
          [category]: nextCategoryOptions,
        },
      }
    }

    case "delete_option": {
      const { category, id, value } = action.payload
      const optionsByCategory = state.options[category]
      if (optionsByCategory.length <= 1) return state

      const nextCategoryOptions = optionsByCategory.filter((o) => o.id !== id)
      const fallback = nextCategoryOptions[0]?.value ?? ""

      return {
        applications: replaceApplicationFieldValue(
          state.applications,
          category,
          value,
          fallback
        ),
        options: {
          ...state.options,
          [category]: nextCategoryOptions,
        },
      }
    }

    case "bulk_import": {
      const { applications: newApps, newOptions } = action.payload

      const nextOptions = { ...state.options }
      for (const { category, option } of newOptions) {
        if (!nextOptions[category].some((o) => o.id === option.id)) {
          nextOptions[category] = [...nextOptions[category], option]
        }
      }

      return {
        options: nextOptions,
        applications: [...newApps, ...state.applications],
      }
    }

    default:
      return state
  }
}
