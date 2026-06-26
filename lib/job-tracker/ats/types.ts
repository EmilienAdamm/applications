import type { JobPostMetadataResult } from "@/lib/job-tracker/job-post-metadata"

export interface AtsMatch {
  /** Provider-specific board / company identifier parsed from the URL. */
  board: string
  /** Provider-specific job identifier parsed from the URL. */
  jobId: string
}

export interface JobPostAdapter {
  /** Human-readable provider name, used for logging. */
  name: string
  /** Returns the parsed identifiers when this adapter handles the URL, else null. */
  match(url: URL): AtsMatch | null
  /**
   * Fetches and maps the posting from the provider's public API. Returns null on
   * a hard failure (network error, 404, unparseable URL) so the caller can fall
   * back to the generic scraper.
   */
  fetch(url: string): Promise<JobPostMetadataResult | null>
}
