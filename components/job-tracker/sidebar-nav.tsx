"use client"

import Link from "next/link"
import {
  BarChart3,
  BriefcaseBusiness,
  ChevronLeft,
  ChevronRight,
  Command,
  Settings2,
} from "lucide-react"
import type { ComponentType } from "react"

import type { AppTab } from "@/lib/job-tracker/types"
import { cn } from "@/lib/utils"

interface SidebarNavProps {
  activeTab: AppTab
  collapsed: boolean
  onToggleCollapse: () => void
}

const NAV_ITEMS: Array<{
  key: AppTab
  label: string
  href: string
  icon: ComponentType<{ className?: string }>
}> = [
  {
    key: "applications",
    label: "Applications",
    href: "/app",
    icon: BriefcaseBusiness,
  },
  {
    key: "analysis",
    label: "Analysis",
    href: "/app/analysis",
    icon: BarChart3,
  },
  {
    key: "settings",
    label: "Settings",
    href: "/app/settings",
    icon: Settings2,
  },
]

export function SidebarNav({
  activeTab,
  collapsed,
  onToggleCollapse,
}: SidebarNavProps) {
  return (
    <>
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-zinc-200 bg-white/95 px-2 py-2 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/90 md:hidden">
        <div className="mx-auto grid max-w-2xl grid-cols-3 gap-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon
            const isActive = item.key === activeTab

            return (
              <Link
                key={item.key}
                href={item.href}
                prefetch
                className={cn(
                  "flex h-12 flex-col items-center justify-center gap-1 rounded-xl text-[11px] font-medium transition",
                  isActive
                    ? "bg-emerald-600 text-white shadow-sm shadow-emerald-600/30"
                    : "text-muted-foreground hover:bg-zinc-100 hover:text-foreground dark:hover:bg-zinc-800"
                )}
                aria-current={isActive ? "page" : undefined}
              >
                <Icon className="size-4 shrink-0" />
                <span>{item.label}</span>
              </Link>
            )
          })}
        </div>
      </nav>

      <aside
        className={cn(
          "hidden h-full min-h-0 self-stretch flex-col justify-between rounded-r-3xl rounded-l-none border border-white/70 bg-white/90 p-3 backdrop-blur transition-[width] duration-300 dark:border-white/10 dark:bg-zinc-900/70 md:flex",
          collapsed ? "w-[92px]" : "w-[268px]"
        )}
      >
        <div className="space-y-3">
          <div
            className={cn(
              "rounded-2xl bg-emerald-50 dark:bg-emerald-950/40",
              collapsed
                ? "flex flex-col items-center gap-2 p-2"
                : "flex items-center justify-between p-2"
            )}
          >
            <div
              className={cn(
                "flex items-center overflow-hidden",
                collapsed ? "justify-center" : "gap-2"
              )}
            >
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white">
                <BriefcaseBusiness className="size-5" />
              </div>
              {!collapsed ? (
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">Applications</p>
                  <p className="truncate text-xs text-muted-foreground">
                    Job tracker
                  </p>
                </div>
              ) : null}
            </div>
            <button
              type="button"
              onClick={onToggleCollapse}
              className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg border border-emerald-200 text-emerald-700 transition hover:bg-emerald-100 dark:border-emerald-800 dark:text-emerald-300 dark:hover:bg-emerald-950/50"
              aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {collapsed ? (
                <ChevronRight className="size-4" />
              ) : (
                <ChevronLeft className="size-4" />
              )}
            </button>
          </div>
          <nav className="space-y-1">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon
              const isActive = item.key === activeTab

              return (
                <Link
                  key={item.key}
                  href={item.href}
                  prefetch
                  className={cn(
                    "flex w-full items-center rounded-xl text-sm font-medium transition",
                    collapsed
                      ? "h-10 justify-center px-0"
                      : "gap-3 px-3 py-2 text-left",
                    isActive
                      ? "bg-emerald-600 text-white shadow-sm shadow-emerald-600/25"
                      : "text-muted-foreground hover:bg-zinc-100 hover:text-foreground dark:hover:bg-zinc-800"
                  )}
                  aria-current={isActive ? "page" : undefined}
                  title={collapsed ? item.label : undefined}
                >
                  <Icon className="size-4 shrink-0" />
                  {!collapsed ? <span>{item.label}</span> : null}
                </Link>
              )
            })}
          </nav>
        </div>
        <div
          className={cn(
            "rounded-2xl border border-zinc-200 bg-zinc-50 text-xs text-muted-foreground dark:border-zinc-800 dark:bg-zinc-900/70",
            collapsed ? "p-2 text-center" : "p-3"
          )}
        >
          {!collapsed ? (
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px]">Collapse sidebar</span>
              <span className="inline-flex items-center gap-1 rounded-md border border-zinc-300 bg-white px-1.5 py-0.5 text-[11px] font-medium text-zinc-700 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-200">
                <Command className="size-3" />
                D
              </span>
            </div>
          ) : (
            <span className="mx-auto inline-flex items-center justify-center rounded-md border border-zinc-300 bg-white px-1.5 py-0.5 text-[11px] font-medium text-zinc-700 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-200">
              <Command className="size-3" />
            </span>
          )}
        </div>
      </aside>
    </>
  )
}
