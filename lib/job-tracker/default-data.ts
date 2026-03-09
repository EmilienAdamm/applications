import type { NewApplicationForm, TrackerOptions } from "@/lib/job-tracker/types"

export function buildDefaultForm(options: TrackerOptions): NewApplicationForm {
  return {
    companyName: "",
    jobPosition: "",
    dateOfApplication: new Date().toISOString().slice(0, 10),
    jobOfferLink: "",
    cvUsed: options.cvUsed[0]?.value ?? "",
    emailUsed: options.emailUsed[0]?.value ?? "",
    status: options.status[0]?.value ?? "",
    finalStatus: "",
  }
}
