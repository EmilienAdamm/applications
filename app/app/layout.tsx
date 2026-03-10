import type { ReactNode } from "react"

import { AppShell } from "@/components/job-tracker/app-shell"

interface TrackerLayoutProps {
  children: ReactNode
}

export default function TrackerLayout({ children }: TrackerLayoutProps) {
  return <AppShell>{children}</AppShell>
}
