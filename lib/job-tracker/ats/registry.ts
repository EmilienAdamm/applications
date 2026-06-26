import "server-only"

import { ashbyAdapter } from "./ashby"
import { greenhouseAdapter } from "./greenhouse"
import { leverAdapter } from "./lever"
import type { JobPostAdapter } from "./types"

// Order is not significant: at most one adapter matches a given hostname.
const ADAPTERS: JobPostAdapter[] = [greenhouseAdapter, leverAdapter, ashbyAdapter]

/** Returns the adapter that handles the URL's ATS provider, or null. */
export function resolveAtsAdapter(url: string): JobPostAdapter | null {
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    return null
  }

  for (const adapter of ADAPTERS) {
    if (adapter.match(parsed)) return adapter
  }

  return null
}
