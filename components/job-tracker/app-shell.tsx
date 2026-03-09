"use client"

import { useEffect, useState, type ReactNode } from "react"

import { SidebarNav } from "@/components/job-tracker/sidebar-nav"
import type { AppTab } from "@/lib/job-tracker/types"

const SIDEBAR_COLLAPSED_STORAGE_KEY = "job-tracker:sidebar-collapsed"

function isTypingTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false
  return (
    target.isContentEditable ||
    target.tagName === "INPUT" ||
    target.tagName === "TEXTAREA" ||
    target.tagName === "SELECT"
  )
}

function tabTitle(activeTab: AppTab) {
  if (activeTab === "applications") return "Applications"
  if (activeTab === "analysis") return "Analysis"
  return "Settings"
}

interface AppShellProps {
  activeTab: AppTab
  children: ReactNode
}

export function AppShell({ activeTab, children }: AppShellProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    try {
      const storedValue = window.localStorage.getItem(SIDEBAR_COLLAPSED_STORAGE_KEY)
      return storedValue === "1"
    } catch {
      return false
    }
  })

  useEffect(() => {
    try {
      window.localStorage.setItem(
        SIDEBAR_COLLAPSED_STORAGE_KEY,
        sidebarCollapsed ? "1" : "0"
      )
    } catch {
      // ignore storage errors
    }
  }, [sidebarCollapsed])

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.defaultPrevented || event.repeat) return
      if (isTypingTarget(event.target)) return
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "d") {
        event.preventDefault()
        setSidebarCollapsed((prev) => !prev)
      }
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [])

  return (
    <main className="min-h-svh bg-[radial-gradient(circle_at_top_left,_#d6f9e8,_transparent_40%),radial-gradient(circle_at_top_right,_#dff4ff,_transparent_30%),linear-gradient(#f7faf8,#f2f5f3)] px-3 py-3 pb-24 dark:bg-[radial-gradient(circle_at_top_left,_#083223,_transparent_45%),radial-gradient(circle_at_top_right,_#102942,_transparent_35%),linear-gradient(#0d1117,#12161d)] md:py-4 md:pr-4 md:pl-0 md:pb-4">
      <div className="flex w-full items-stretch gap-4">
        <SidebarNav
          activeTab={activeTab}
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed((prev) => !prev)}
        />

        <section className="min-h-[calc(100svh-7rem)] min-w-0 flex-1 rounded-3xl border border-white/70 bg-white/80 p-4 shadow-sm backdrop-blur dark:border-white/10 dark:bg-zinc-900/60 md:min-h-[calc(100svh-1rem)] md:p-6">
          <header className="mb-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">
              Job Applications Dashboard
            </p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight md:text-3xl">
              {tabTitle(activeTab)}
            </h1>
          </header>

          {children}
        </section>
      </div>
    </main>
  )
}
