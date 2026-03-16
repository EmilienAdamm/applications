import type { NewApplicationForm, TrackerOptions } from "@/lib/job-tracker/types"
import { getDefaultStatusFormValue } from "@/lib/job-tracker/default-options"

export function buildDefaultForm(options: TrackerOptions): NewApplicationForm {
  return {
    companyName: "",
    jobPosition: "",
    dateOfApplication: new Date().toISOString().slice(0, 10),
    jobOfferLink: "",
    cvUsed: options.cvUsed[0]?.value ?? "",
    emailUsed: options.emailUsed[0]?.value ?? "",
    status: getDefaultStatusFormValue(options),
    finalStatus: "",
  }
}
