import type { NewApplicationForm, TrackerOptions } from "@/lib/job-tracker/types"
import {
  getDefaultOptionFormValue,
  getDefaultStatusFormValue,
  getFavoriteOptionValue,
} from "@/lib/job-tracker/default-options"

export function buildDefaultForm(options: TrackerOptions): NewApplicationForm {
  return {
    companyName: "",
    jobPosition: "",
    dateOfApplication: new Date().toISOString().slice(0, 10),
    jobOfferLink: "",
    cvUsed: getDefaultOptionFormValue(options.cvUsed),
    emailUsed: getDefaultOptionFormValue(options.emailUsed),
    status: getDefaultStatusFormValue(options),
    finalStatus: getFavoriteOptionValue(options.finalStatus),
  }
}
